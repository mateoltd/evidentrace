/**
 * EvidenTrace - Browser Capture Service
 * 
 * Playwright-based browser capture engine for rendering pages
 * and capturing screenshots, DOM snapshots, and optional video.
 * 
 * Evidentiary rationale: Browser capture shows what a typical user
 * would see when visiting a URL, including JavaScript-rendered content,
 * providing visual evidence of the page's appearance at capture time.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import { EvidenceLogger } from '../common/logger.js';
import {
  BrowserCaptureResult,
  BrowserNetworkEntry,
  BrowserConsoleEntry,
  BrowserMetadata,
  NavigationTiming,
  CaptureOptions,
} from './capture.types.js';
import type { AppConfig } from '../config/configuration.js';

// Playwright version for metadata
const PLAYWRIGHT_VERSION = '1.57.0';

@Injectable()
export class BrowserCaptureService implements OnModuleDestroy {
  private browser: Browser | null = null;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: EvidenceLogger,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  /**
   * Ensure browser is launched.
   */
  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      const headless = this.configService.get('browser.headless', { infer: true }) ?? true;
      
      this.logger.log('Launching Chromium browser', { headless });
      
      this.browser = await chromium.launch({
        headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Close the browser instance.
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Perform browser-based capture of a URL.
   */
  async capture(
    options: CaptureOptions,
    outputDir: string,
  ): Promise<BrowserCaptureResult> {
    const startTime = new Date();
    const captureStartTime = startTime.toISOString();
    
    this.logger.log('Starting browser capture', { url: options.url });
    
    const browser = await this.ensureBrowser();
    const viewportWidth = this.configService.get('browser.viewportWidth', { infer: true }) ?? 1920;
    const viewportHeight = this.configService.get('browser.viewportHeight', { infer: true }) ?? 1080;
    const timeoutMs = options.timeoutMs ?? 
      this.configService.get('defaultTimeoutMs', { infer: true }) ?? 30000;
    const recordVideo = options.recordVideo ?? false;
    const maxVideoLengthMs = this.configService.get('browser.maxVideoLengthMs', { infer: true }) ?? 30000;
    
    const networkRequests: BrowserNetworkEntry[] = [];
    const consoleMessages: BrowserConsoleEntry[] = [];
    const errors: string[] = [];
    
    // Context options
    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: { width: viewportWidth, height: viewportHeight },
      userAgent: undefined, // Use default Chromium UA
      locale: 'en-US',
      timezoneId: 'UTC',
    };
    
    // Add video recording if enabled
    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: outputDir,
        size: { width: viewportWidth, height: viewportHeight },
      };
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    // Set up network request logging
    page.on('request', (request) => {
      const entry: Partial<BrowserNetworkEntry> = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        requestHeaders: request.headers(),
        timestamp: new Date().toISOString(),
      };
      networkRequests.push(entry as BrowserNetworkEntry);
    });
    
    page.on('response', (response) => {
      const url = response.url();
      const entry = networkRequests.find(
        (e) => e.url === url && e.statusCode === null
      );
      if (entry) {
        entry.statusCode = response.status();
        entry.responseHeaders = response.headers();
        entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();
      }
    });
    
    // Set up console message logging
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location()?.url ?? null,
      });
    });
    
    // Set up error logging
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
      this.logger.warn('Browser page error', { error: error.message });
    });
    
    let finalUrl = options.url;
    let pageTitle = '';
    let navigationTiming: NavigationTiming | null = null;
    
    try {
      // Navigate to the URL
      this.logger.log('Navigating to URL', { url: options.url });
      
      const response = await page.goto(options.url, {
        waitUntil: 'networkidle',
        timeout: timeoutMs,
      });
      
      finalUrl = page.url();
      pageTitle = await page.title();
      
      this.logger.log('Navigation completed', { 
        finalUrl, 
        pageTitle,
        status: response?.status() 
      });
      
      // Wait a bit for any late-loading content
      await page.waitForTimeout(1000);
      
      // Get navigation timing
      try {
        const timing = await page.evaluate(() => {
          const perf = window.performance.timing;
          return {
            responseStart: perf.responseStart - perf.navigationStart,
            domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
            loadComplete: perf.loadEventEnd - perf.navigationStart,
          };
        });
        navigationTiming = timing;
      } catch {
        this.logger.warn('Could not retrieve navigation timing');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Navigation failed: ${errorMessage}`);
      this.logger.error('Browser navigation failed', errorMessage);
    }
    
    // Capture screenshot
    const screenshotPath = path.join(outputDir, 'screenshot.png');
    try {
      this.logger.log('Capturing full-page screenshot');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Screenshot failed: ${errorMessage}`);
      this.logger.error('Screenshot capture failed', errorMessage);
    }
    
    // Capture DOM snapshot
    const domSnapshotPath = path.join(outputDir, 'browser-dom.html');
    try {
      this.logger.log('Capturing DOM snapshot');
      const domContent = await page.content();
      const fs = await import('fs');
      await fs.promises.writeFile(domSnapshotPath, domContent, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`DOM snapshot failed: ${errorMessage}`);
      this.logger.error('DOM snapshot failed', errorMessage);
    }
    
    // Get browser metadata
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const browserVersion = browser.version();
    
    const browserMetadata: BrowserMetadata = {
      userAgent,
      browserVersion,
      operatingSystem: `${os.platform()} ${os.release()}`,
      viewportWidth,
      viewportHeight,
      devicePixelRatio: 1,
      playwrightVersion: PLAYWRIGHT_VERSION,
    };
    
    // Close page and context
    await page.close();
    
    // Handle video file
    let videoPath: string | null = null;
    if (recordVideo) {
      try {
        const video = await context.pages()[0]?.video?.();
        if (video) {
          const tempVideoPath = await video.path();
          videoPath = path.join(outputDir, 'screen-capture.webm');
          const fs = await import('fs');
          await fs.promises.rename(tempVideoPath, videoPath);
          this.logger.log('Video recording saved', { videoPath });
        }
      } catch {
        this.logger.warn('Could not save video recording');
      }
    }
    
    await context.close();
    
    const endTime = new Date();
    const captureEndTime = endTime.toISOString();
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    
    const result: BrowserCaptureResult = {
      originalUrl: options.url,
      finalUrl,
      pageTitle,
      screenshotPath,
      domSnapshotPath,
      videoPath,
      networkRequests,
      consoleMessages,
      browserMetadata,
      navigationTiming,
      captureStartTime,
      captureEndTime,
      totalDurationMs,
      errors,
    };
    
    this.logger.log('Browser capture completed', {
      originalUrl: options.url,
      finalUrl,
      totalDurationMs,
      networkRequestCount: networkRequests.length,
      errorCount: errors.length,
    });
    
    return result;
  }
}

