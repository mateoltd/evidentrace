import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpCaptureService } from './http-capture.service.js';
import { EvidenceLogger } from '../common/logger.js';

describe('HttpCaptureService', () => {
  let service: HttpCaptureService;
  let logger: EvidenceLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpCaptureService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, unknown> = {
                maxRedirects: 10,
                defaultTimeoutMs: 30000,
              };
              return config[key];
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
            setAcquisitionLogPath: jest.fn(),
            getLogEntries: jest.fn(() => []),
            clearLogEntries: jest.fn(),
            persistLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HttpCaptureService>(HttpCaptureService);
    logger = module.get<EvidenceLogger>(EvidenceLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('capture', () => {
    it('should capture a simple URL without redirects', async () => {
      const result = await service.capture({
        url: 'https://httpbin.org/html',
        maxRedirects: 10,
        timeoutMs: 30000,
      });

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://httpbin.org/html');
      expect(result.finalUrl).toBeDefined();
      expect(result.redirectChain).toBeDefined();
      expect(result.redirectChain.length).toBeGreaterThan(0);
      expect(result.rawBody).toBeDefined();
      expect(result.captureStartTime).toBeDefined();
      expect(result.captureEndTime).toBeDefined();
    }, 30000);

    it('should follow redirects and record the chain', async () => {
      const result = await service.capture({
        url: 'https://httpbin.org/redirect/2',
        maxRedirects: 10,
        timeoutMs: 30000,
      });

      expect(result).toBeDefined();
      expect(result.redirectChain.length).toBeGreaterThanOrEqual(2);
      
      // Check that redirect hops have required fields
      for (const hop of result.redirectChain) {
        expect(hop.requestUrl).toBeDefined();
        expect(hop.statusCode).toBeDefined();
        expect(hop.requestTimestamp).toBeDefined();
        expect(hop.responseTimestamp).toBeDefined();
        expect(hop.durationMs).toBeDefined();
      }
    }, 30000);

    it('should handle invalid URLs gracefully', async () => {
      const result = await service.capture({
        url: 'https://this-domain-does-not-exist-12345.com',
        maxRedirects: 10,
        timeoutMs: 5000,
      });

      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    }, 10000);

    it('should respect max redirects limit', async () => {
      const result = await service.capture({
        url: 'https://httpbin.org/redirect/5',
        maxRedirects: 2,
        timeoutMs: 30000,
      });

      expect(result).toBeDefined();
      // Should stop after max redirects
      expect(result.redirectChain.length).toBeLessThanOrEqual(4); // 2 redirects + potential final
      expect(result.errors.some(e => e.includes('Maximum redirects'))).toBe(true);
    }, 30000);
  });
});

