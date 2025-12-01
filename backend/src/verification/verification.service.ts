/**
 * EvidenTrace - Verification Service
 * 
 * Handles verification of evidence integrity and timestamp proofs.
 * 
 * Evidentiary rationale: Independent verification capability allows
 * third parties to confirm evidence integrity without trusting the
 * original capture system.
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { EvidenceLogger } from '../common/logger.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { 
  HashVerificationResult, 
  TimestampVerificationResult 
} from '../capture/capture.types.js';

interface VerificationLogEntry {
  timestamp: string;
  action: string;
  acquisitionId: string;
  result: string;
  details: Record<string, unknown>;
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly cryptoService: CryptoService,
    private readonly logger: EvidenceLogger,
  ) {}

  /**
   * Verify all file hashes in an acquisition.
   */
  async verifyHashes(acquisitionId: string): Promise<HashVerificationResult> {
    this.logger.log('Starting hash verification', { acquisitionId });
    
    const acquisitionPath = this.evidenceService.getAcquisitionPath(acquisitionId);
    const manifest = await this.evidenceService.loadManifest(acquisitionPath);
    
    const result = await this.cryptoService.verifyHashes(acquisitionPath, manifest);
    
    const verificationResult: HashVerificationResult = {
      overallStatus: result.overallStatus,
      verifiedAt: new Date().toISOString(),
      files: result.files,
      masterHash: result.masterHash,
    };
    
    // Log the verification
    await this.logVerification(acquisitionPath, {
      timestamp: verificationResult.verifiedAt,
      action: 'hash_verification',
      acquisitionId,
      result: verificationResult.overallStatus,
      details: {
        filesChecked: result.files.length,
        filesPassed: result.files.filter(f => f.status === 'pass').length,
        filesFailed: result.files.filter(f => f.status === 'fail').length,
        filesMissing: result.files.filter(f => f.status === 'missing').length,
        masterHashStatus: result.masterHash.status,
      },
    });
    
    this.logger.log('Hash verification completed', {
      acquisitionId,
      overallStatus: verificationResult.overallStatus,
    });
    
    return verificationResult;
  }

  /**
   * Verify OpenTimestamps proof for an acquisition.
   */
  async verifyTimestamp(acquisitionId: string): Promise<TimestampVerificationResult> {
    this.logger.log('Starting timestamp verification', { acquisitionId });
    
    const acquisitionPath = this.evidenceService.getAcquisitionPath(acquisitionId);
    const manifest = await this.evidenceService.loadManifest(acquisitionPath);
    
    const verificationResult = await this.cryptoService.verifyTimestamp(
      acquisitionPath,
      manifest,
    );
    
    const result: TimestampVerificationResult = {
      status: verificationResult.status,
      verifiedAt: new Date().toISOString(),
      stampedHash: manifest.timestampProof?.stampedHash ?? '',
      bitcoinBlock: null,
      attestations: [],
      errorMessage: verificationResult.status === 'error' 
        ? verificationResult.message 
        : null,
    };
    
    // Add attestation details if available
    if (verificationResult.details.calendarUrls) {
      result.attestations.push({
        type: 'calendar',
        timestamp: manifest.timestampProof?.requestedAt ?? '',
        details: `Submitted to: ${(verificationResult.details.calendarUrls as string[]).join(', ')}`,
      });
    }
    
    // Log the verification
    await this.logVerification(acquisitionPath, {
      timestamp: result.verifiedAt,
      action: 'timestamp_verification',
      acquisitionId,
      result: result.status,
      details: {
        stampedHash: result.stampedHash,
        message: verificationResult.message,
      },
    });
    
    this.logger.log('Timestamp verification completed', {
      acquisitionId,
      status: result.status,
    });
    
    return result;
  }

  /**
   * Log a verification action to the acquisition's verification log.
   */
  private async logVerification(
    acquisitionPath: string,
    entry: VerificationLogEntry,
  ): Promise<void> {
    const logPath = path.join(acquisitionPath, 'verification-log.json');
    
    let existingLog: VerificationLogEntry[] = [];
    
    try {
      const content = await fs.promises.readFile(logPath, 'utf-8');
      existingLog = JSON.parse(content);
    } catch {
      // File doesn't exist yet, start with empty array
    }
    
    existingLog.push(entry);
    
    await fs.promises.writeFile(
      logPath,
      JSON.stringify(existingLog, null, 2),
      'utf-8'
    );
  }
}

