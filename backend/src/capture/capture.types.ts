/**
 * EvidenTrace - Capture Domain Types
 * 
 * These types define the core data structures for web evidence capture,
 * designed to maximize evidentiary value in legal/forensic contexts.
 */

/**
 * Represents a single hop in an HTTP redirect chain.
 * Each hop captures the full context of the request/response at that point.
 * 
 * Evidentiary rationale: Redirect chains are critical for understanding
 * how a user would arrive at a final destination, and can reveal
 * intermediary servers, tracking redirects, or URL shortener resolutions.
 */
export interface RedirectHop {
  /** The URL that was requested */
  requestUrl: string;
  /** HTTP status code returned (e.g., 301, 302, 307, 308) */
  statusCode: number;
  /** HTTP status message (e.g., "Moved Permanently") */
  statusMessage: string;
  /** All response headers as key-value pairs */
  headers: Record<string, string | string[]>;
  /** The Location header value (next URL in chain), if present */
  locationHeader: string | null;
  /** UTC timestamp when the request was initiated */
  requestTimestamp: string;
  /** UTC timestamp when the response was received */
  responseTimestamp: string;
  /** Duration of this hop in milliseconds */
  durationMs: number;
  /** Size of response body in bytes (if applicable) */
  bodySize: number | null;
  /** HTTP method used */
  method: string;
}

/**
 * Result of a non-browser HTTP capture using a low-level HTTP client.
 * Captures raw protocol-level data without JavaScript execution.
 * 
 * Evidentiary rationale: Raw HTTP capture shows what a server actually
 * returns without browser interpretation, useful for detecting
 * cloaking, server-side rendering differences, or malicious redirects.
 */
export interface HttpCaptureResult {
  /** The originally requested URL */
  originalUrl: string;
  /** The final URL after all redirects */
  finalUrl: string;
  /** Complete redirect chain from original to final */
  redirectChain: RedirectHop[];
  /** Final HTTP status code */
  finalStatusCode: number;
  /** All headers from the final response */
  finalHeaders: Record<string, string | string[]>;
  /** Raw HTML/body content from the final response */
  rawBody: string;
  /** Content-Type of the final response */
  contentType: string | null;
  /** Total size of the final response body in bytes */
  bodySize: number;
  /** UTC timestamp when capture started */
  captureStartTime: string;
  /** UTC timestamp when capture completed */
  captureEndTime: string;
  /** Total duration of the entire capture in milliseconds */
  totalDurationMs: number;
  /** User-Agent string used for the request */
  userAgent: string;
  /** Any errors encountered during capture */
  errors: string[];
}

/**
 * Network request entry captured by the browser.
 */
export interface BrowserNetworkEntry {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Resource type (document, script, image, etc.) */
  resourceType: string;
  /** HTTP status code */
  statusCode: number | null;
  /** Request headers */
  requestHeaders: Record<string, string>;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** UTC timestamp */
  timestamp: string;
  /** Duration in milliseconds */
  durationMs: number | null;
}

/**
 * Console message captured from the browser.
 */
export interface BrowserConsoleEntry {
  /** Message type (log, warning, error, info) */
  type: string;
  /** Message text */
  text: string;
  /** UTC timestamp */
  timestamp: string;
  /** Source location if available */
  location: string | null;
}

/**
 * Result of a browser-based capture using Playwright/Chromium.
 * Captures the rendered page as a user would see it.
 * 
 * Evidentiary rationale: Browser capture shows the actual rendered
 * content including JavaScript-generated elements, providing evidence
 * of what a typical user would see when visiting the URL.
 */
export interface BrowserCaptureResult {
  /** The originally requested URL */
  originalUrl: string;
  /** The final URL after navigation */
  finalUrl: string;
  /** Page title */
  pageTitle: string;
  /** Path to the full-page screenshot */
  screenshotPath: string;
  /** Path to the DOM snapshot HTML file */
  domSnapshotPath: string;
  /** Path to video recording (if enabled) */
  videoPath: string | null;
  /** Network requests made during page load */
  networkRequests: BrowserNetworkEntry[];
  /** Console messages captured */
  consoleMessages: BrowserConsoleEntry[];
  /** Browser metadata */
  browserMetadata: BrowserMetadata;
  /** Navigation timing data */
  navigationTiming: NavigationTiming | null;
  /** UTC timestamp when capture started */
  captureStartTime: string;
  /** UTC timestamp when capture completed */
  captureEndTime: string;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Browser and system metadata for the capture.
 */
export interface BrowserMetadata {
  /** Full user-agent string */
  userAgent: string;
  /** Browser name and version */
  browserVersion: string;
  /** Operating system */
  operatingSystem: string;
  /** Viewport width in pixels */
  viewportWidth: number;
  /** Viewport height in pixels */
  viewportHeight: number;
  /** Device pixel ratio */
  devicePixelRatio: number;
  /** Playwright version */
  playwrightVersion: string;
}

/**
 * Navigation timing metrics from the browser.
 */
export interface NavigationTiming {
  /** Time to first byte */
  responseStart: number;
  /** DOM content loaded time */
  domContentLoaded: number;
  /** Full page load time */
  loadComplete: number;
}

/**
 * A file artifact in the evidence bundle.
 */
export interface EvidenceArtifact {
  /** Filename relative to acquisition directory */
  filename: string;
  /** Human-readable description */
  description: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA256 hash (hex encoded) */
  sha256: string;
  /** UTC timestamp when file was created */
  createdAt: string;
  /** Evidentiary purpose of this artifact */
  evidentiaryPurpose: string;
}

/**
 * OpenTimestamps proof information.
 */
export interface TimestampProof {
  /** Type of timestamp (e.g., "opentimestamps") */
  type: string;
  /** Path to the proof file */
  proofFile: string;
  /** SHA256 of the stamped content */
  stampedHash: string;
  /** Status of the timestamp (pending, confirmed) */
  status: 'pending' | 'confirmed' | 'error';
  /** UTC timestamp when stamp was requested */
  requestedAt: string;
  /** Bitcoin block height (if confirmed) */
  blockHeight: number | null;
  /** Bitcoin transaction ID (if available) */
  transactionId: string | null;
  /** Calendar server URLs used */
  calendarUrls: string[];
  /** Error message if status is error */
  errorMessage: string | null;
}

/**
 * Complete evidence manifest documenting an acquisition.
 * This is the master document that ties all artifacts together.
 * 
 * Evidentiary rationale: The manifest provides a complete chain of
 * custody record, documenting exactly what was captured, when, how,
 * and with what tools, enabling independent verification.
 */
export interface EvidenceManifest {
  /** Manifest schema version */
  schemaVersion: string;
  /** Unique acquisition identifier */
  acquisitionId: string;
  /** UTC timestamp when acquisition started */
  acquisitionStartTime: string;
  /** UTC timestamp when acquisition completed */
  acquisitionEndTime: string;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  
  /** Target information */
  target: {
    /** Originally requested URL */
    originalUrl: string;
    /** Final URL after redirects */
    finalUrl: string;
    /** Number of redirects followed */
    redirectCount: number;
  };
  
  /** Operator/user information */
  operator: {
    /** Operator notes/comments */
    notes: string;
    /** Purpose of the capture */
    purpose: string;
  };
  
  /** System environment information */
  environment: {
    /** EvidenTrace version */
    toolVersion: string;
    /** Node.js version */
    nodeVersion: string;
    /** Operating system */
    operatingSystem: string;
    /** System hostname */
    hostname: string;
    /** System timezone */
    timezone: string;
    /** Local system time at capture start */
    localSystemTime: string;
  };
  
  /** Capture configuration used */
  captureConfig: {
    /** Maximum redirects allowed */
    maxRedirects: number;
    /** Request timeout in milliseconds */
    timeoutMs: number;
    /** Whether browser capture was enabled */
    browserCaptureEnabled: boolean;
    /** Whether video recording was enabled */
    videoEnabled: boolean;
    /** Custom headers used (if any) */
    customHeaders: Record<string, string>;
    /** User-Agent used for HTTP capture */
    httpUserAgent: string;
  };
  
  /** List of all artifacts in the bundle */
  artifacts: EvidenceArtifact[];
  
  /** Master hash of all artifact hashes */
  masterHash: {
    /** Algorithm used (SHA256) */
    algorithm: string;
    /** Hash value (hex encoded) */
    value: string;
    /** How the master hash was computed */
    computationMethod: string;
  };
  
  /** Timestamp proof information */
  timestampProof: TimestampProof | null;
  
  /** Capture results summary */
  captureResults: {
    /** HTTP capture result (if performed) */
    httpCapture: HttpCaptureResult | null;
    /** Browser capture result (if performed) */
    browserCapture: Omit<BrowserCaptureResult, 'screenshotPath' | 'domSnapshotPath' | 'videoPath'> | null;
  };
  
  /** Legal disclaimer */
  disclaimer: string;
}

/**
 * Options for initiating a capture.
 */
export interface CaptureOptions {
  /** Target URL to capture */
  url: string;
  /** Maximum number of redirects to follow (default: 10) */
  maxRedirects?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Whether to perform browser capture (default: true) */
  browserCapture?: boolean;
  /** Whether to record video (default: false) */
  recordVideo?: boolean;
  /** Whether to generate ZIP bundle (default: true) */
  generateZip?: boolean;
  /** Whether to generate PDF summary (default: true) */
  generatePdf?: boolean;
  /** Custom HTTP headers */
  customHeaders?: Record<string, string>;
  /** Operator notes */
  operatorNotes?: string;
  /** Purpose of the capture */
  purpose?: string;
  /** Custom User-Agent for HTTP capture */
  userAgent?: string;
}

/**
 * Response from a capture operation.
 */
export interface CaptureResponse {
  /** Whether the capture succeeded */
  success: boolean;
  /** Acquisition ID */
  acquisitionId: string;
  /** Path to the acquisition directory */
  acquisitionPath: string;
  /** Path to the ZIP file (if generated) */
  zipPath: string | null;
  /** Path to the PDF summary (if generated) */
  pdfPath: string | null;
  /** The complete manifest */
  manifest: EvidenceManifest;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Evidence list item for API responses.
 */
export interface EvidenceListItem {
  /** Acquisition ID */
  acquisitionId: string;
  /** Original URL captured */
  originalUrl: string;
  /** Final URL after redirects */
  finalUrl: string;
  /** UTC timestamp of acquisition */
  timestamp: string;
  /** Whether the capture was successful */
  success: boolean;
  /** Number of artifacts */
  artifactCount: number;
  /** Whether ZIP exists */
  hasZip: boolean;
  /** Whether PDF exists */
  hasPdf: boolean;
  /** Whether timestamp proof exists */
  hasTimestampProof: boolean;
}

/**
 * Hash verification result.
 */
export interface HashVerificationResult {
  /** Overall verification status */
  overallStatus: 'pass' | 'fail';
  /** UTC timestamp of verification */
  verifiedAt: string;
  /** Per-file verification results */
  files: Array<{
    filename: string;
    expectedHash: string;
    actualHash: string;
    status: 'pass' | 'fail' | 'missing';
  }>;
  /** Master hash verification */
  masterHash: {
    expectedHash: string;
    actualHash: string;
    status: 'pass' | 'fail';
  };
}

/**
 * OpenTimestamps verification result.
 */
export interface TimestampVerificationResult {
  /** Verification status */
  status: 'verified' | 'pending' | 'invalid' | 'error';
  /** UTC timestamp of verification */
  verifiedAt: string;
  /** The hash that was timestamped */
  stampedHash: string;
  /** Bitcoin block information (if verified) */
  bitcoinBlock: {
    height: number;
    timestamp: string;
    hash: string;
  } | null;
  /** Attestation details */
  attestations: Array<{
    type: string;
    timestamp: string;
    details: string;
  }>;
  /** Error message if status is error */
  errorMessage: string | null;
}

/**
 * Internal log entry for deterministic logging.
 */
export interface LogEntry {
  /** UTC timestamp */
  timestamp: string;
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

