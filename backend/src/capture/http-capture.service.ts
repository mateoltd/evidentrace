/**
 * EvidenTrace - HTTP Capture Service
 * 
 * Non-browser capture engine using low-level HTTP client.
 * Manually follows redirects to capture the complete chain.
 * 
 * Evidentiary rationale: Raw HTTP capture provides protocol-level evidence
 * of server responses without browser interpretation, revealing the actual
 * data sent by servers before any client-side processing.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { EvidenceLogger } from '../common/logger.js';
import { 
  HttpCaptureResult, 
  RedirectHop, 
  CaptureOptions 
} from './capture.types.js';
import type { AppConfig } from '../config/configuration.js';

const DEFAULT_USER_AGENT = 'EvidenTrace/1.0.0 (Digital Evidence Capture System)';

@Injectable()
export class HttpCaptureService {
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: EvidenceLogger,
  ) {}

  /**
   * Perform HTTP capture with full redirect chain tracking.
   */
  async capture(options: CaptureOptions): Promise<HttpCaptureResult> {
    const startTime = new Date();
    const captureStartTime = startTime.toISOString();
    
    this.logger.log('Starting HTTP capture', { url: options.url });
    
    const maxRedirects = options.maxRedirects ?? 
      this.configService.get('maxRedirects', { infer: true }) ?? 10;
    const timeoutMs = options.timeoutMs ?? 
      this.configService.get('defaultTimeoutMs', { infer: true }) ?? 30000;
    const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    
    const redirectChain: RedirectHop[] = [];
    const errors: string[] = [];
    
    let currentUrl = options.url;
    let finalResponse: AxiosResponse | null = null;
    let redirectCount = 0;
    
    // Manually follow redirects to capture each hop
    while (redirectCount <= maxRedirects) {
      const hopStartTime = new Date();
      
      this.logger.log(`HTTP request hop ${redirectCount}`, { url: currentUrl });
      
      try {
        const response = await axios.get(currentUrl, {
          maxRedirects: 0, // Don't auto-follow redirects
          validateStatus: () => true, // Accept all status codes
          timeout: timeoutMs,
          headers: {
            'User-Agent': userAgent,
            ...options.customHeaders,
          },
          responseType: 'text',
          // Capture full response including headers
          decompress: true,
        });
        
        const hopEndTime = new Date();
        const durationMs = hopEndTime.getTime() - hopStartTime.getTime();
        
        // Record headers as a plain object
        const headers: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) {
            headers[key.toLowerCase()] = value as string | string[];
          }
        }
        
        const locationHeader = this.getLocationHeader(headers);
        const bodySize = typeof response.data === 'string' 
          ? Buffer.byteLength(response.data, 'utf-8') 
          : 0;
        
        const hop: RedirectHop = {
          requestUrl: currentUrl,
          statusCode: response.status,
          statusMessage: response.statusText || this.getStatusMessage(response.status),
          headers,
          locationHeader,
          requestTimestamp: hopStartTime.toISOString(),
          responseTimestamp: hopEndTime.toISOString(),
          durationMs,
          bodySize,
          method: 'GET',
        };
        
        redirectChain.push(hop);
        
        this.logger.log(`HTTP response received`, {
          url: currentUrl,
          status: response.status,
          hasLocation: !!locationHeader,
          durationMs,
        });
        
        // Check if this is a redirect
        if (this.isRedirectStatus(response.status) && locationHeader) {
          // Resolve relative URLs
          currentUrl = new URL(locationHeader, currentUrl).href;
          redirectCount++;
          
          if (redirectCount > maxRedirects) {
            errors.push(`Maximum redirects (${maxRedirects}) exceeded`);
            this.logger.warn('Maximum redirects exceeded', { maxRedirects });
            break;
          }
        } else {
          // Final response reached
          finalResponse = response;
          break;
        }
      } catch (error) {
        const hopEndTime = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.logger.error('HTTP request failed', errorMessage, { url: currentUrl });
        errors.push(`Request to ${currentUrl} failed: ${errorMessage}`);
        
        // Record the failed hop
        redirectChain.push({
          requestUrl: currentUrl,
          statusCode: 0,
          statusMessage: 'Request Failed',
          headers: {},
          locationHeader: null,
          requestTimestamp: hopStartTime.toISOString(),
          responseTimestamp: hopEndTime.toISOString(),
          durationMs: hopEndTime.getTime() - hopStartTime.getTime(),
          bodySize: null,
          method: 'GET',
        });
        
        break;
      }
    }
    
    const endTime = new Date();
    const captureEndTime = endTime.toISOString();
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    
    // Build the result
    const lastHop = redirectChain[redirectChain.length - 1];
    const rawBody = finalResponse?.data ?? '';
    const contentType = lastHop?.headers['content-type'] as string | undefined ?? null;
    
    const result: HttpCaptureResult = {
      originalUrl: options.url,
      finalUrl: lastHop?.requestUrl ?? options.url,
      redirectChain,
      finalStatusCode: lastHop?.statusCode ?? 0,
      finalHeaders: lastHop?.headers ?? {},
      rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
      contentType,
      bodySize: Buffer.byteLength(rawBody, 'utf-8'),
      captureStartTime,
      captureEndTime,
      totalDurationMs,
      userAgent,
      errors,
    };
    
    this.logger.log('HTTP capture completed', {
      originalUrl: options.url,
      finalUrl: result.finalUrl,
      redirectCount: redirectChain.length - 1,
      totalDurationMs,
      success: errors.length === 0,
    });
    
    return result;
  }

  /**
   * Extract Location header from response headers.
   */
  private getLocationHeader(headers: Record<string, string | string[]>): string | null {
    const location = headers['location'];
    if (!location) return null;
    return Array.isArray(location) ? location[0] : location;
  }

  /**
   * Check if status code indicates a redirect.
   */
  private isRedirectStatus(status: number): boolean {
    return [301, 302, 303, 307, 308].includes(status);
  }

  /**
   * Get standard HTTP status message.
   */
  private getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      303: 'See Other',
      304: 'Not Modified',
      307: 'Temporary Redirect',
      308: 'Permanent Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return messages[status] || 'Unknown';
  }
}

