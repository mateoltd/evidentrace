/**
 * EvidenTrace - Packaging Service
 * 
 * Creates ZIP bundles and PDF summaries of evidence acquisitions.
 * 
 * Evidentiary rationale: Self-contained bundles facilitate evidence
 * transfer and archival. PDF summaries provide human-readable
 * documentation suitable for legal proceedings.
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import PDFDocument from 'pdfkit';
import { EvidenceLogger } from '../common/logger.js';
import { EvidenceManifest } from '../capture/capture.types.js';

@Injectable()
export class PackagingService {
  constructor(private readonly logger: EvidenceLogger) {}

  /**
   * Create a ZIP archive of the entire acquisition directory.
   */
  async createZipBundle(
    acquisitionPath: string,
    acquisitionId: string,
  ): Promise<string> {
    this.logger.log('Creating ZIP bundle');
    
    const zipPath = path.join(acquisitionPath, `${acquisitionId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver.default('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        this.logger.log('ZIP bundle created', { 
          path: zipPath, 
          size: archive.pointer() 
        });
        resolve(zipPath);
      });
      
      archive.on('error', (err) => {
        this.logger.error('ZIP creation failed', err.message);
        reject(err);
      });
      
      archive.pipe(output);
      
      // Add all files except the ZIP itself
      const files = fs.readdirSync(acquisitionPath);
      for (const file of files) {
        if (file.endsWith('.zip')) continue;
        
        const filePath = path.join(acquisitionPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          archive.file(filePath, { name: file });
        }
      }
      
      archive.finalize();
    });
  }

  /**
   * Generate a human-readable PDF summary of the acquisition.
   */
  async createPdfSummary(
    acquisitionPath: string,
    manifest: EvidenceManifest,
  ): Promise<string> {
    this.logger.log('Creating PDF summary');
    
    const pdfPath = path.join(acquisitionPath, 'summary.pdf');
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 } 
    });
    
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Title
    doc.fontSize(24).font('Helvetica-Bold')
       .text('EvidenTrace Evidence Report', { align: 'center' });
    doc.moveDown();
    
    // Subtitle with acquisition ID
    doc.fontSize(12).font('Helvetica')
       .text(`Acquisition ID: ${manifest.acquisitionId}`, { align: 'center' });
    doc.moveDown(2);
    
    // Horizontal line
    this.drawLine(doc);
    doc.moveDown();
    
    // Target Information
    doc.fontSize(14).font('Helvetica-Bold').text('Target Information');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Original URL: ${manifest.target.originalUrl}`);
    doc.text(`Final URL: ${manifest.target.finalUrl}`);
    doc.text(`Redirect Count: ${manifest.target.redirectCount}`);
    doc.moveDown();
    
    // Timestamps
    doc.fontSize(14).font('Helvetica-Bold').text('Timestamps');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Capture Start (UTC): ${manifest.acquisitionStartTime}`);
    doc.text(`Capture End (UTC): ${manifest.acquisitionEndTime}`);
    doc.text(`Duration: ${manifest.totalDurationMs}ms`);
    doc.text(`Local System Time: ${manifest.environment.localSystemTime}`);
    doc.text(`Timezone: ${manifest.environment.timezone}`);
    doc.moveDown();
    
    // Environment
    doc.fontSize(14).font('Helvetica-Bold').text('Capture Environment');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Tool Version: EvidenTrace ${manifest.environment.toolVersion}`);
    doc.text(`Node.js: ${manifest.environment.nodeVersion}`);
    doc.text(`Operating System: ${manifest.environment.operatingSystem}`);
    doc.text(`Hostname: ${manifest.environment.hostname}`);
    doc.moveDown();
    
    // Configuration
    doc.fontSize(14).font('Helvetica-Bold').text('Capture Configuration');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Max Redirects: ${manifest.captureConfig.maxRedirects}`);
    doc.text(`Timeout: ${manifest.captureConfig.timeoutMs}ms`);
    doc.text(`Browser Capture: ${manifest.captureConfig.browserCaptureEnabled ? 'Yes' : 'No'}`);
    doc.text(`Video Recording: ${manifest.captureConfig.videoEnabled ? 'Yes' : 'No'}`);
    doc.text(`HTTP User-Agent: ${manifest.captureConfig.httpUserAgent}`);
    doc.moveDown();
    
    // Operator Notes
    if (manifest.operator.notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('Operator Notes');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(manifest.operator.notes);
      doc.moveDown();
    }
    
    // New page for redirect chain
    doc.addPage();
    
    // Redirect Chain
    if (manifest.captureResults.httpCapture?.redirectChain.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('HTTP Redirect Chain');
      doc.moveDown(0.5);
      
      const chain = manifest.captureResults.httpCapture.redirectChain;
      for (let i = 0; i < chain.length; i++) {
        const hop = chain[i];
        doc.fontSize(10).font('Helvetica-Bold')
           .text(`Hop ${i + 1}: ${hop.statusCode} ${hop.statusMessage}`);
        doc.fontSize(9).font('Helvetica');
        doc.text(`URL: ${hop.requestUrl}`, { indent: 20 });
        if (hop.locationHeader) {
          doc.text(`Location: ${hop.locationHeader}`, { indent: 20 });
        }
        doc.text(`Timestamp: ${hop.responseTimestamp}`, { indent: 20 });
        doc.text(`Duration: ${hop.durationMs}ms`, { indent: 20 });
        doc.moveDown(0.5);
      }
      doc.moveDown();
    }
    
    // Key Headers from final response
    if (manifest.captureResults.httpCapture?.finalHeaders) {
      doc.fontSize(14).font('Helvetica-Bold').text('Final Response Headers');
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');
      
      const headers = manifest.captureResults.httpCapture.finalHeaders;
      const importantHeaders = [
        'content-type', 'server', 'date', 'last-modified', 
        'cache-control', 'x-powered-by', 'x-frame-options',
        'content-security-policy', 'strict-transport-security'
      ];
      
      for (const key of importantHeaders) {
        const value = headers[key];
        if (value) {
          const displayValue = Array.isArray(value) ? value.join(', ') : value;
          doc.text(`${key}: ${displayValue}`);
        }
      }
      doc.moveDown();
    }
    
    // New page for artifacts and crypto
    doc.addPage();
    
    // Artifacts
    doc.fontSize(14).font('Helvetica-Bold').text('Evidence Artifacts');
    doc.moveDown(0.5);
    
    for (const artifact of manifest.artifacts) {
      doc.fontSize(10).font('Helvetica-Bold').text(artifact.filename);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Description: ${artifact.description}`, { indent: 20 });
      doc.text(`Type: ${artifact.mimeType}`, { indent: 20 });
      doc.text(`Size: ${artifact.sizeBytes} bytes`, { indent: 20 });
      doc.text(`SHA256: ${artifact.sha256}`, { indent: 20 });
      doc.moveDown(0.5);
    }
    doc.moveDown();
    
    // Cryptographic Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Cryptographic Integrity');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Hash Algorithm: ${manifest.masterHash.algorithm}`);
    doc.text(`Master Hash: ${manifest.masterHash.value}`);
    doc.text(`Computation Method: ${manifest.masterHash.computationMethod}`);
    doc.moveDown();
    
    // Timestamp Proof
    if (manifest.timestampProof) {
      doc.fontSize(14).font('Helvetica-Bold').text('Timestamp Proof (OpenTimestamps)');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Status: ${manifest.timestampProof.status}`);
      doc.text(`Proof File: ${manifest.timestampProof.proofFile}`);
      doc.text(`Stamped Hash: ${manifest.timestampProof.stampedHash}`);
      doc.text(`Requested At: ${manifest.timestampProof.requestedAt}`);
      doc.text(`Calendar Servers: ${manifest.timestampProof.calendarUrls.join(', ')}`);
      
      if (manifest.timestampProof.errorMessage) {
        doc.text(`Error: ${manifest.timestampProof.errorMessage}`);
      }
      doc.moveDown();
      
      // Verification instructions
      doc.fontSize(12).font('Helvetica-Bold').text('How to Verify the Timestamp');
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      doc.text('1. Install the OpenTimestamps client: pip install opentimestamps-client');
      doc.text('2. Run: ots verify manifest.json.ots');
      doc.text('3. The tool will check the proof against the Bitcoin blockchain');
      doc.text('4. A confirmed timestamp proves the evidence existed at that block time');
      doc.moveDown();
    }
    
    // Disclaimer
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Legal Disclaimer');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(manifest.disclaimer, { align: 'justify' });
    doc.moveDown(2);
    
    // Footer with generation timestamp
    doc.fontSize(8).font('Helvetica')
       .text(`Report generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.text('EvidenTrace - Digital Evidence Capture System', { align: 'center' });
    
    // Finalize
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        this.logger.log('PDF summary created', { path: pdfPath });
        resolve(pdfPath);
      });
      stream.on('error', reject);
    });
  }

  /**
   * Draw a horizontal line.
   */
  private drawLine(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    doc.moveTo(50, y)
       .lineTo(doc.page.width - 50, y)
       .stroke();
  }
}

