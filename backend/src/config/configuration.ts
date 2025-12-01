/**
 * EvidenTrace - Configuration
 * 
 * Centralized configuration with environment variable support.
 */

export interface AppConfig {
  port: number;
  evidenceRootPath: string;
  maxRedirects: number;
  defaultTimeoutMs: number;
  maxBodySizeBytes: number;
  openTimestamps: {
    enabled: boolean;
    calendarUrls: string[];
  };
  browser: {
    headless: boolean;
    viewportWidth: number;
    viewportHeight: number;
    maxVideoLengthMs: number;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  evidenceRootPath: process.env.EVIDENCE_ROOT_PATH || './evidence',
  maxRedirects: parseInt(process.env.MAX_REDIRECTS || '10', 10),
  defaultTimeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS || '30000', 10),
  maxBodySizeBytes: parseInt(process.env.MAX_BODY_SIZE_BYTES || '52428800', 10), // 50MB
  openTimestamps: {
    enabled: process.env.OTS_ENABLED !== 'false',
    calendarUrls: (process.env.OTS_CALENDAR_URLS || 
      'https://a.pool.opentimestamps.org,https://b.pool.opentimestamps.org,https://a.pool.eternitywall.com')
      .split(',')
      .map(url => url.trim()),
  },
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    viewportWidth: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || '1920', 10),
    viewportHeight: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '1080', 10),
    maxVideoLengthMs: parseInt(process.env.MAX_VIDEO_LENGTH_MS || '30000', 10),
  },
});

