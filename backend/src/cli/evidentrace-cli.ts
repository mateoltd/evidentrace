#!/usr/bin/env node
/**
 * EvidenTrace - Command Line Interface
 * 
 * CLI tool for scripted evidence captures and verification.
 * Reuses the same services as the web API for consistent behavior.
 */

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module.js';
import { CaptureModule } from '../capture/capture.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { PackagingModule } from '../packaging/packaging.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { HttpCaptureService } from '../capture/http-capture.service.js';
import { BrowserCaptureService } from '../capture/browser-capture.service.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { PackagingService } from '../packaging/packaging.service.js';
import { VerificationService } from '../verification/verification.service.js';
import { EvidenceLogger } from '../common/logger.js';
import { CaptureOptions } from '../capture/capture.types.js';
import configuration from '../config/configuration.js';
import * as path from 'path';

// CLI-specific module that imports all required modules
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    CaptureModule,
    EvidenceModule,
    CryptoModule,
    PackagingModule,
    VerificationModule,
  ],
})
class CliModule {}

interface CliArgs {
  command: string;
  url?: string;
  acquisitionId?: string;
  options: {
    maxRedirects?: number;
    timeout?: number;
    noBrowser?: boolean;
    video?: boolean;
    noZip?: boolean;
    noPdf?: boolean;
    notes?: string;
    purpose?: string;
    output?: string;
  };
}

function printHelp(): void {
  console.log(`
EvidenTrace CLI - Digital Evidence Capture System

Usage:
  evidentrace capture <url> [options]    Capture evidence from a URL
  evidentrace verify <acquisition-id>    Verify hashes and timestamp
  evidentrace list                       List all acquisitions
  evidentrace help                       Show this help message

Capture Options:
  --max-redirects <n>    Maximum redirects to follow (default: 10)
  --timeout <ms>         Request timeout in milliseconds (default: 30000)
  --no-browser           Skip browser capture
  --video                Enable video recording
  --no-zip               Skip ZIP bundle creation
  --no-pdf               Skip PDF summary creation
  --notes <text>         Operator notes
  --purpose <text>       Purpose of capture

Examples:
  evidentrace capture https://example.com
  evidentrace capture https://example.com --video --notes "Legal hold capture"
  evidentrace verify 2025-11-30T12-00-00Z_abc123
  evidentrace list
`);
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    command: args[0] || 'help',
    options: {},
  };

  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const option = arg.slice(2);
      switch (option) {
        case 'max-redirects':
          result.options.maxRedirects = parseInt(args[++i], 10);
          break;
        case 'timeout':
          result.options.timeout = parseInt(args[++i], 10);
          break;
        case 'no-browser':
          result.options.noBrowser = true;
          break;
        case 'video':
          result.options.video = true;
          break;
        case 'no-zip':
          result.options.noZip = true;
          break;
        case 'no-pdf':
          result.options.noPdf = true;
          break;
        case 'notes':
          result.options.notes = args[++i];
          break;
        case 'purpose':
          result.options.purpose = args[++i];
          break;
        case 'output':
          result.options.output = args[++i];
          break;
        case 'help':
          result.command = 'help';
          break;
      }
    } else if (!result.url && !result.acquisitionId) {
      if (result.command === 'capture') {
        result.url = arg;
      } else if (result.command === 'verify') {
        result.acquisitionId = arg;
      }
    }
    i++;
  }

  return result;
}

async function runCapture(
  args: CliArgs,
  httpCaptureService: HttpCaptureService,
  browserCaptureService: BrowserCaptureService,
  evidenceService: EvidenceService,
  cryptoService: CryptoService,
  packagingService: PackagingService,
  logger: EvidenceLogger,
): Promise<void> {
  if (!args.url) {
    console.error('Error: URL is required for capture command');
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(args.url);
  } catch {
    console.error('Error: Invalid URL provided');
    process.exit(1);
  }

  console.log(`\n🔍 Starting capture of: ${args.url}\n`);

  const startTime = new Date();
  
  // Create acquisition directory
  const { id: acquisitionId, path: acquisitionPath } = 
    await evidenceService.createAcquisitionDirectory();
  
  console.log(`📁 Acquisition ID: ${acquisitionId}`);
  console.log(`📂 Output path: ${acquisitionPath}\n`);
  
  // Set up logging
  logger.setAcquisitionLogPath(path.join(acquisitionPath, 'logs.json'));

  const options: CaptureOptions = {
    url: args.url,
    maxRedirects: args.options.maxRedirects ?? 10,
    timeoutMs: args.options.timeout ?? 30000,
    browserCapture: !args.options.noBrowser,
    recordVideo: args.options.video ?? false,
    generateZip: !args.options.noZip,
    generatePdf: !args.options.noPdf,
    operatorNotes: args.options.notes ?? '',
    purpose: args.options.purpose ?? 'CLI capture',
  };

  const errors: string[] = [];

  // HTTP Capture
  console.log('📡 Performing HTTP capture...');
  const httpResult = await httpCaptureService.capture(options);
  if (httpResult.errors.length > 0) {
    errors.push(...httpResult.errors);
  }
  await evidenceService.saveHttpCaptureResults(acquisitionPath, httpResult);
  console.log(`   ✓ Captured ${httpResult.redirectChain.length} redirect hop(s)`);
  console.log(`   ✓ Final URL: ${httpResult.finalUrl}`);

  // Browser Capture
  let browserResult = null;
  if (options.browserCapture) {
    console.log('🌐 Performing browser capture...');
    browserResult = await browserCaptureService.capture(options, acquisitionPath);
    if (browserResult.errors.length > 0) {
      errors.push(...browserResult.errors);
    }
    console.log(`   ✓ Screenshot saved`);
    console.log(`   ✓ DOM snapshot saved`);
    if (browserResult.videoPath) {
      console.log(`   ✓ Video recording saved`);
    }
  }

  const endTime = new Date();

  // Generate manifest
  console.log('📋 Generating manifest...');
  let manifest = await evidenceService.generateManifest(
    acquisitionId,
    acquisitionPath,
    options,
    httpResult,
    browserResult,
    startTime,
    endTime,
  );

  // Compute hashes
  console.log('🔐 Computing cryptographic hashes...');
  manifest = await cryptoService.computeArtifactHashes(acquisitionPath, manifest);
  console.log(`   ✓ Master hash: ${manifest.masterHash.value.substring(0, 16)}...`);

  // Timestamp proof
  console.log('⏱️  Creating timestamp proof...');
  const timestampProof = await cryptoService.createTimestampProof(
    acquisitionPath,
    manifest,
  );
  manifest.timestampProof = timestampProof;
  if (timestampProof.status === 'pending') {
    console.log('   ✓ Timestamp submitted to calendar servers');
  } else {
    console.log(`   ⚠ Timestamp status: ${timestampProof.status}`);
  }

  // Save manifest
  await evidenceService.saveManifest(acquisitionPath, manifest);
  await logger.persistLogs();

  // Add logs to manifest
  manifest.artifacts.push({
    filename: 'logs.json',
    description: 'Capture operation logs',
    mimeType: 'application/json',
    sizeBytes: 0,
    sha256: '',
    createdAt: new Date().toISOString(),
    evidentiaryPurpose: 'Provides detailed timeline of capture operations.',
  });
  manifest = await cryptoService.computeArtifactHashes(acquisitionPath, manifest);
  await evidenceService.saveManifest(acquisitionPath, manifest);

  // PDF summary
  if (options.generatePdf) {
    console.log('📄 Generating PDF summary...');
    await packagingService.createPdfSummary(acquisitionPath, manifest);
    console.log('   ✓ summary.pdf created');
  }

  // ZIP bundle
  if (options.generateZip) {
    console.log('📦 Creating ZIP bundle...');
    await packagingService.createZipBundle(acquisitionPath, acquisitionId);
    console.log(`   ✓ ${acquisitionId}.zip created`);
  }

  logger.clearLogEntries();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Capture completed successfully!');
  console.log('═'.repeat(60));
  console.log(`\nAcquisition ID: ${acquisitionId}`);
  console.log(`Output folder:  ${acquisitionPath}`);
  console.log(`Duration:       ${endTime.getTime() - startTime.getTime()}ms`);
  console.log(`Artifacts:      ${manifest.artifacts.length} files`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Warnings/Errors: ${errors.length}`);
    for (const error of errors) {
      console.log(`   - ${error}`);
    }
  }
  
  console.log('\nTo verify this capture:');
  console.log(`  evidentrace verify ${acquisitionId}`);
  console.log('');
}

async function runVerify(
  args: CliArgs,
  verificationService: VerificationService,
): Promise<void> {
  if (!args.acquisitionId) {
    console.error('Error: Acquisition ID is required for verify command');
    process.exit(1);
  }

  console.log(`\n🔍 Verifying acquisition: ${args.acquisitionId}\n`);

  // Verify hashes
  console.log('🔐 Verifying file hashes...');
  const hashResult = await verificationService.verifyHashes(args.acquisitionId);
  
  for (const file of hashResult.files) {
    const icon = file.status === 'pass' ? '✓' : file.status === 'missing' ? '?' : '✗';
    console.log(`   ${icon} ${file.filename}: ${file.status}`);
  }
  
  console.log(`   Master hash: ${hashResult.masterHash.status}`);
  console.log(`   Overall: ${hashResult.overallStatus === 'pass' ? '✅ PASS' : '❌ FAIL'}`);

  // Verify timestamp
  console.log('\n⏱️  Verifying timestamp proof...');
  const tsResult = await verificationService.verifyTimestamp(args.acquisitionId);
  
  console.log(`   Status: ${tsResult.status}`);
  if (tsResult.errorMessage) {
    console.log(`   Message: ${tsResult.errorMessage}`);
  }
  
  console.log('\n' + '═'.repeat(60));
  if (hashResult.overallStatus === 'pass') {
    console.log('✅ Verification completed - Evidence integrity confirmed');
  } else {
    console.log('❌ Verification failed - Evidence may have been modified');
  }
  console.log('═'.repeat(60) + '\n');
}

async function runList(evidenceService: EvidenceService): Promise<void> {
  console.log('\n📋 Evidence Acquisitions\n');
  
  const acquisitions = await evidenceService.listAcquisitions();
  
  if (acquisitions.length === 0) {
    console.log('No acquisitions found.\n');
    return;
  }

  console.log('ID                                    | URL                                    | Date');
  console.log('-'.repeat(100));
  
  for (const acq of acquisitions) {
    const id = acq.acquisitionId.substring(0, 35).padEnd(37);
    const url = acq.originalUrl.substring(0, 38).padEnd(40);
    const date = new Date(acq.timestamp).toLocaleString();
    console.log(`${id} | ${url} | ${date}`);
  }
  
  console.log(`\nTotal: ${acquisitions.length} acquisition(s)\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'help' || !args.command) {
    printHelp();
    return;
  }

  // Bootstrap NestJS application context
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: false, // Suppress NestJS bootstrap logs
  });

  try {
    const evidenceService = app.get(EvidenceService);
    
    switch (args.command) {
      case 'capture':
        await runCapture(
          args,
          app.get(HttpCaptureService),
          app.get(BrowserCaptureService),
          evidenceService,
          app.get(CryptoService),
          app.get(PackagingService),
          app.get(EvidenceLogger),
        );
        break;
        
      case 'verify':
        await runVerify(args, app.get(VerificationService));
        break;
        
      case 'list':
        await runList(evidenceService);
        break;
        
      default:
        console.error(`Unknown command: ${args.command}`);
        printHelp();
        process.exit(1);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});

