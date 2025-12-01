import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service.js';
import { EvidenceLogger } from '../common/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CryptoService', () => {
  let service: CryptoService;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'openTimestamps') {
                return {
                  enabled: false, // Disable OTS for tests
                  calendarUrls: [],
                };
              }
              return undefined;
            }),
          },
        },
        {
          provide: EvidenceLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);

    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidentrace-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashString', () => {
    it('should compute correct SHA256 hash for a string', () => {
      const input = 'hello world';
      const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      
      const result = service.hashString(input);
      
      expect(result).toBe(expectedHash);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hashString('input1');
      const hash2 = service.hashString('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes for the same input', () => {
      const input = 'test input';
      const hash1 = service.hashString(input);
      const hash2 = service.hashString(input);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('hashBuffer', () => {
    it('should compute correct SHA256 hash for a buffer', () => {
      const input = Buffer.from('hello world', 'utf-8');
      const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      
      const result = service.hashBuffer(input);
      
      expect(result).toBe(expectedHash);
    });
  });

  describe('hashFile', () => {
    it('should compute correct SHA256 hash for a file', async () => {
      const testContent = 'hello world';
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testContent, 'utf-8');
      
      const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      
      const result = await service.hashFile(testFile);
      
      expect(result).toBe(expectedHash);
    });

    it('should handle binary files', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
      const testFile = path.join(tempDir, 'binary.bin');
      fs.writeFileSync(testFile, binaryContent);
      
      const result = await service.hashFile(testFile);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(64); // SHA256 hex string length
    });
  });

  describe('verifyHashes', () => {
    it('should verify hashes correctly', async () => {
      // Create test files
      const file1Content = 'file 1 content';
      const file2Content = 'file 2 content';
      
      const file1Path = path.join(tempDir, 'file1.txt');
      const file2Path = path.join(tempDir, 'file2.txt');
      
      fs.writeFileSync(file1Path, file1Content);
      fs.writeFileSync(file2Path, file2Content);
      
      const file1Hash = service.hashString(file1Content);
      const file2Hash = service.hashString(file2Content);
      const masterHash = service.hashString(file1Hash + file2Hash);
      
      const manifest = {
        artifacts: [
          { filename: 'file1.txt', sha256: file1Hash },
          { filename: 'file2.txt', sha256: file2Hash },
        ],
        masterHash: {
          value: masterHash,
        },
      } as any;
      
      const result = await service.verifyHashes(tempDir, manifest);
      
      expect(result.overallStatus).toBe('pass');
      expect(result.files[0].status).toBe('pass');
      expect(result.files[1].status).toBe('pass');
      expect(result.masterHash.status).toBe('pass');
    });

    it('should detect tampered files', async () => {
      // Create test file
      const originalContent = 'original content';
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, originalContent);
      
      const originalHash = service.hashString(originalContent);
      
      // Tamper with the file
      fs.writeFileSync(filePath, 'tampered content');
      
      const manifest = {
        artifacts: [
          { filename: 'file.txt', sha256: originalHash },
        ],
        masterHash: {
          value: service.hashString(originalHash),
        },
      } as any;
      
      const result = await service.verifyHashes(tempDir, manifest);
      
      expect(result.overallStatus).toBe('fail');
      expect(result.files[0].status).toBe('fail');
    });

    it('should detect missing files', async () => {
      const manifest = {
        artifacts: [
          { filename: 'nonexistent.txt', sha256: 'abc123' },
        ],
        masterHash: {
          value: service.hashString('abc123'),
        },
      } as any;
      
      const result = await service.verifyHashes(tempDir, manifest);
      
      expect(result.overallStatus).toBe('fail');
      expect(result.files[0].status).toBe('missing');
    });
  });
});

