/**
 * EvidenTrace - Capture Controller
 * 
 * REST API endpoints for evidence capture operations.
 */

import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Res, 
  HttpException, 
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { EvidenceLogger } from '../common/logger.js';
import { HttpCaptureService } from './http-capture.service.js';
import { BrowserCaptureService } from './browser-capture.service.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { PackagingService } from '../packaging/packaging.service.js';
import { 
  CaptureOptions, 
  CaptureResponse, 
  EvidenceListItem,
  EvidenceManifest,
} from './capture.types.js';
import { CaptureRequestDto } from './capture.dto.js';

@Controller('api')
export class CaptureController {
  constructor(
    private readonly httpCaptureService: HttpCaptureService,
    private readonly browserCaptureService: BrowserCaptureService,
    private readonly evidenceService: EvidenceService,
    private readonly cryptoService: CryptoService,
    private readonly packagingService: PackagingService,
    private readonly logger: EvidenceLogger,
  ) {}

  /**
   * POST /api/capture
   * Initiate a new evidence capture.
   */
  @Post('capture')
  async capture(@Body() dto: CaptureRequestDto): Promise<CaptureResponse> {
    const startTime = new Date();
    
    this.logger.log('Capture request received', { url: dto.url });
    
    // Validate URL
    try {
      new URL(dto.url);
    } catch {
      throw new HttpException('Invalid URL provided', HttpStatus.BAD_REQUEST);
    }
    
    // Create acquisition directory
    const { id: acquisitionId, path: acquisitionPath } = 
      await this.evidenceService.createAcquisitionDirectory();
    
    // Set up logging for this acquisition
    this.logger.setAcquisitionLogPath(path.join(acquisitionPath, 'logs.json'));
    
    const options: CaptureOptions = {
      url: dto.url,
      maxRedirects: dto.maxRedirects ?? 10,
      timeoutMs: dto.timeoutMs ?? 30000,
      browserCapture: dto.browserCapture ?? true,
      recordVideo: dto.recordVideo ?? false,
      generateZip: dto.generateZip ?? true,
      generatePdf: dto.generatePdf ?? true,
      customHeaders: dto.customHeaders ?? {},
      operatorNotes: dto.operatorNotes ?? '',
      purpose: dto.purpose ?? 'Evidence capture',
      userAgent: dto.userAgent,
    };
    
    const errors: string[] = [];
    let httpResult = null;
    let browserResult = null;
    
    try {
      // Perform HTTP capture
      this.logger.log('Starting HTTP capture phase');
      httpResult = await this.httpCaptureService.capture(options);
      
      if (httpResult.errors.length > 0) {
        errors.push(...httpResult.errors);
      }
      
      // Save HTTP capture results
      await this.evidenceService.saveHttpCaptureResults(acquisitionPath, httpResult);
      
      // Perform browser capture if enabled
      if (options.browserCapture) {
        this.logger.log('Starting browser capture phase');
        browserResult = await this.browserCaptureService.capture(options, acquisitionPath);
        
        if (browserResult.errors.length > 0) {
          errors.push(...browserResult.errors);
        }
      }
      
      const endTime = new Date();
      
      // Generate manifest
      this.logger.log('Generating evidence manifest');
      let manifest = await this.evidenceService.generateManifest(
        acquisitionId,
        acquisitionPath,
        options,
        httpResult,
        browserResult,
        startTime,
        endTime,
      );
      
      // Compute hashes
      this.logger.log('Computing cryptographic hashes');
      manifest = await this.cryptoService.computeArtifactHashes(acquisitionPath, manifest);
      
      // Create OpenTimestamps proof
      this.logger.log('Creating timestamp proof');
      const timestampProof = await this.cryptoService.createTimestampProof(
        acquisitionPath,
        manifest,
      );
      manifest.timestampProof = timestampProof;
      
      // Save manifest
      await this.evidenceService.saveManifest(acquisitionPath, manifest);
      
      // Persist logs
      await this.logger.persistLogs();
      
      // Re-add logs.json to artifacts and recompute hashes
      manifest.artifacts.push({
        filename: 'logs.json',
        description: 'Capture operation logs',
        mimeType: 'application/json',
        sizeBytes: 0,
        sha256: '',
        createdAt: new Date().toISOString(),
        evidentiaryPurpose: 'Provides detailed timeline of capture operations for audit purposes.',
      });
      
      manifest = await this.cryptoService.computeArtifactHashes(acquisitionPath, manifest);
      await this.evidenceService.saveManifest(acquisitionPath, manifest);
      
      // Generate PDF summary if requested
      let pdfPath: string | null = null;
      if (options.generatePdf) {
        this.logger.log('Generating PDF summary');
        pdfPath = await this.packagingService.createPdfSummary(acquisitionPath, manifest);
        
        // Add PDF to artifacts
        manifest.artifacts.push({
          filename: 'summary.pdf',
          description: 'Human-readable PDF summary',
          mimeType: 'application/pdf',
          sizeBytes: 0,
          sha256: '',
          createdAt: new Date().toISOString(),
          evidentiaryPurpose: 'Provides formatted documentation suitable for legal proceedings.',
        });
        
        manifest = await this.cryptoService.computeArtifactHashes(acquisitionPath, manifest);
        await this.evidenceService.saveManifest(acquisitionPath, manifest);
      }
      
      // Generate ZIP bundle if requested
      let zipPath: string | null = null;
      if (options.generateZip) {
        this.logger.log('Creating ZIP bundle');
        zipPath = await this.packagingService.createZipBundle(acquisitionPath, acquisitionId);
      }
      
      this.logger.clearLogEntries();
      
      const response: CaptureResponse = {
        success: errors.length === 0,
        acquisitionId,
        acquisitionPath,
        zipPath,
        pdfPath,
        manifest,
        errors,
      };
      
      this.logger.log('Capture completed successfully', { 
        acquisitionId,
        errorCount: errors.length,
      });
      
      return response;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Capture failed', errorMessage);
      
      throw new HttpException(
        `Capture failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/evidence
   * List all evidence acquisitions.
   */
  @Get('evidence')
  async listEvidence(): Promise<EvidenceListItem[]> {
    return this.evidenceService.listAcquisitions();
  }

  /**
   * GET /api/evidence/:id/manifest
   * Get the manifest for a specific acquisition.
   */
  @Get('evidence/:id/manifest')
  async getManifest(@Param('id') id: string): Promise<EvidenceManifest> {
    try {
      const acquisitionPath = this.evidenceService.getAcquisitionPath(id);
      return await this.evidenceService.loadManifest(acquisitionPath);
    } catch {
      throw new HttpException('Acquisition not found', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * GET /api/evidence/:id/files/:filename
   * Download a specific file from an acquisition.
   */
  @Get('evidence/:id/files/:filename')
  async getFile(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const acquisitionPath = this.evidenceService.getAcquisitionPath(id);
    const filePath = path.join(acquisitionPath, sanitizedFilename);
    
    try {
      await fs.promises.access(filePath);
    } catch {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    
    // Determine content type
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.json': 'application/json',
      '.html': 'text/html',
      '.png': 'image/png',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.ots': 'application/octet-stream',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
    });
    
    const file = fs.createReadStream(filePath);
    return new StreamableFile(file);
  }
}

