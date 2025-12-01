/**
 * EvidenTrace - Crypto Service
 * 
 * Handles SHA256 hashing of evidence artifacts and OpenTimestamps integration.
 * 
 * Evidentiary rationale: Cryptographic hashes provide tamper-evident seals
 * on captured evidence. OpenTimestamps creates blockchain-anchored proofs
 * that the evidence existed at a specific point in time, independent of
 * any single authority.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { EvidenceLogger } from '../common/logger.js';
import { EvidenceManifest, TimestampProof } from '../capture/capture.types.js';
import type { AppConfig } from '../config/configuration.js';

@Injectable()
export class CryptoService {
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: EvidenceLogger,
  ) {}

  /**
   * Compute SHA256 hash of a file.
   */
  async hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Compute SHA256 hash of a string.
   */
  hashString(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Compute SHA256 hash of a buffer.
   */
  hashBuffer(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Compute hashes for all artifacts in a manifest and update it.
   */
  async computeArtifactHashes(
    acquisitionPath: string,
    manifest: EvidenceManifest,
  ): Promise<EvidenceManifest> {
    this.logger.log('Computing artifact hashes');
    
    const hashList: string[] = [];
    
    for (const artifact of manifest.artifacts) {
      const filePath = path.join(acquisitionPath, artifact.filename);
      
      try {
        const hash = await this.hashFile(filePath);
        artifact.sha256 = hash;
        hashList.push(hash);
        
        // Update file size
        const stats = await fs.promises.stat(filePath);
        artifact.sizeBytes = stats.size;
        
        this.logger.log(`Computed hash for ${artifact.filename}`, { 
          hash: hash.substring(0, 16) + '...' 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to hash ${artifact.filename}`, errorMessage);
        artifact.sha256 = 'ERROR: ' + errorMessage;
      }
    }
    
    // Compute master hash from all artifact hashes
    const masterHashInput = hashList.join('');
    manifest.masterHash.value = this.hashString(masterHashInput);
    
    this.logger.log('Computed master hash', { 
      hash: manifest.masterHash.value.substring(0, 16) + '...',
      artifactCount: hashList.length,
    });
    
    return manifest;
  }

  /**
   * Create OpenTimestamps proof for the manifest.
   * Uses the OpenTimestamps calendar servers via HTTP.
   */
  async createTimestampProof(
    acquisitionPath: string,
    manifest: EvidenceManifest,
  ): Promise<TimestampProof> {
    const otsConfig = this.configService.get('openTimestamps', { infer: true });
    const enabled = otsConfig?.enabled ?? true;
    const calendarUrls = otsConfig?.calendarUrls ?? [
      'https://a.pool.opentimestamps.org',
      'https://b.pool.opentimestamps.org',
    ];
    
    if (!enabled) {
      this.logger.log('OpenTimestamps disabled, skipping timestamp proof');
      return {
        type: 'opentimestamps',
        proofFile: '',
        stampedHash: manifest.masterHash.value,
        status: 'error',
        requestedAt: new Date().toISOString(),
        blockHeight: null,
        transactionId: null,
        calendarUrls: [],
        errorMessage: 'OpenTimestamps is disabled in configuration',
      };
    }
    
    this.logger.log('Creating OpenTimestamps proof');
    
    // The hash to timestamp (master hash of the manifest)
    const hashToStamp = manifest.masterHash.value;
    const hashBytes = Buffer.from(hashToStamp, 'hex');
    
    const proof: TimestampProof = {
      type: 'opentimestamps',
      proofFile: 'manifest.json.ots',
      stampedHash: hashToStamp,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      blockHeight: null,
      transactionId: null,
      calendarUrls,
      errorMessage: null,
    };
    
    // Try to submit to calendar servers
    let otsProofData: Buffer | null = null;
    
    for (const calendarUrl of calendarUrls) {
      try {
        this.logger.log(`Submitting to calendar: ${calendarUrl}`);
        
        const response = await axios.post(
          `${calendarUrl}/digest`,
          hashBytes,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/vnd.opentimestamps.v1',
            },
            responseType: 'arraybuffer',
            timeout: 30000,
          }
        );
        
        if (response.status === 200 && response.data) {
          // Build a minimal OTS file structure
          // OTS file format: magic bytes + version + hash type + hash + attestations
          const magicBytes = Buffer.from([0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]);
          const hashType = Buffer.from([0x08]); // SHA256
          const calendarResponse = Buffer.from(response.data);
          
          otsProofData = Buffer.concat([magicBytes, hashType, hashBytes, calendarResponse]);
          
          this.logger.log('Successfully obtained timestamp from calendar', { 
            calendarUrl,
            responseSize: calendarResponse.length,
          });
          
          break; // Success, no need to try other calendars
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Calendar submission failed: ${calendarUrl}`, { error: errorMessage });
      }
    }
    
    if (otsProofData) {
      // Save the OTS proof file
      const otsPath = path.join(acquisitionPath, 'manifest.json.ots');
      await fs.promises.writeFile(otsPath, otsProofData);
      
      proof.status = 'pending'; // Will be confirmed when Bitcoin block is mined
      this.logger.log('OpenTimestamps proof created', { 
        proofFile: proof.proofFile,
        status: proof.status,
      });
    } else {
      proof.status = 'error';
      proof.errorMessage = 'Failed to obtain timestamp from any calendar server';
      this.logger.error('Failed to create OpenTimestamps proof');
    }
    
    return proof;
  }

  /**
   * Verify hashes of all artifacts against the manifest.
   */
  async verifyHashes(
    acquisitionPath: string,
    manifest: EvidenceManifest,
  ): Promise<{
    overallStatus: 'pass' | 'fail';
    files: Array<{
      filename: string;
      expectedHash: string;
      actualHash: string;
      status: 'pass' | 'fail' | 'missing';
    }>;
    masterHash: {
      expectedHash: string;
      actualHash: string;
      status: 'pass' | 'fail';
    };
  }> {
    this.logger.log('Verifying artifact hashes');
    
    const fileResults: Array<{
      filename: string;
      expectedHash: string;
      actualHash: string;
      status: 'pass' | 'fail' | 'missing';
    }> = [];
    
    const hashList: string[] = [];
    let allPassed = true;
    
    for (const artifact of manifest.artifacts) {
      const filePath = path.join(acquisitionPath, artifact.filename);
      
      try {
        const actualHash = await this.hashFile(filePath);
        hashList.push(actualHash);
        
        const status = actualHash === artifact.sha256 ? 'pass' : 'fail';
        if (status === 'fail') allPassed = false;
        
        fileResults.push({
          filename: artifact.filename,
          expectedHash: artifact.sha256,
          actualHash,
          status,
        });
      } catch {
        allPassed = false;
        fileResults.push({
          filename: artifact.filename,
          expectedHash: artifact.sha256,
          actualHash: '',
          status: 'missing',
        });
      }
    }
    
    // Verify master hash
    const actualMasterHash = this.hashString(hashList.join(''));
    const masterHashStatus = actualMasterHash === manifest.masterHash.value ? 'pass' : 'fail';
    if (masterHashStatus === 'fail') allPassed = false;
    
    this.logger.log('Hash verification completed', {
      overallStatus: allPassed ? 'pass' : 'fail',
      filesChecked: fileResults.length,
    });
    
    return {
      overallStatus: allPassed ? 'pass' : 'fail',
      files: fileResults,
      masterHash: {
        expectedHash: manifest.masterHash.value,
        actualHash: actualMasterHash,
        status: masterHashStatus,
      },
    };
  }

  /**
   * Verify OpenTimestamps proof.
   * Note: Full verification requires checking against Bitcoin blockchain.
   * This is a basic verification that checks the proof file structure.
   */
  async verifyTimestamp(
    acquisitionPath: string,
    manifest: EvidenceManifest,
  ): Promise<{
    status: 'verified' | 'pending' | 'invalid' | 'error';
    message: string;
    details: Record<string, unknown>;
  }> {
    this.logger.log('Verifying OpenTimestamps proof');
    
    if (!manifest.timestampProof) {
      return {
        status: 'error',
        message: 'No timestamp proof found in manifest',
        details: {},
      };
    }
    
    const otsPath = path.join(acquisitionPath, manifest.timestampProof.proofFile);
    
    try {
      await fs.promises.access(otsPath);
      const otsData = await fs.promises.readFile(otsPath);
      
      // Basic validation: check magic bytes
      const magicBytes = otsData.slice(0, 31);
      const expectedMagic = Buffer.from([0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]);
      
      if (!magicBytes.equals(expectedMagic)) {
        return {
          status: 'invalid',
          message: 'Invalid OTS file format',
          details: { reason: 'Magic bytes mismatch' },
        };
      }
      
      // The proof is valid structurally but may be pending Bitcoin confirmation
      return {
        status: 'pending',
        message: 'Timestamp proof is valid but may be pending Bitcoin confirmation. Use the OpenTimestamps client for full verification.',
        details: {
          stampedHash: manifest.timestampProof.stampedHash,
          requestedAt: manifest.timestampProof.requestedAt,
          calendarUrls: manifest.timestampProof.calendarUrls,
          proofFileSize: otsData.length,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        message: `Failed to verify timestamp: ${errorMessage}`,
        details: {},
      };
    }
  }
}

