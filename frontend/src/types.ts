/**
 * EvidenTrace Frontend Types
 * Mirrors backend types for API communication
 */

export interface RedirectHop {
  requestUrl: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  locationHeader: string | null;
  requestTimestamp: string;
  responseTimestamp: string;
  durationMs: number;
  bodySize: number | null;
  method: string;
}

export interface HttpCaptureResult {
  originalUrl: string;
  finalUrl: string;
  redirectChain: RedirectHop[];
  finalStatusCode: number;
  finalHeaders: Record<string, string | string[]>;
  rawBody: string;
  contentType: string | null;
  bodySize: number;
  captureStartTime: string;
  captureEndTime: string;
  totalDurationMs: number;
  userAgent: string;
  errors: string[];
}

export interface BrowserNetworkEntry {
  url: string;
  method: string;
  resourceType: string;
  statusCode: number | null;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  timestamp: string;
  durationMs: number | null;
}

export interface BrowserMetadata {
  userAgent: string;
  browserVersion: string;
  operatingSystem: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  playwrightVersion: string;
}

export interface EvidenceArtifact {
  filename: string;
  description: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  evidentiaryPurpose: string;
}

export interface TimestampProof {
  type: string;
  proofFile: string;
  stampedHash: string;
  status: 'pending' | 'confirmed' | 'error';
  requestedAt: string;
  blockHeight: number | null;
  transactionId: string | null;
  calendarUrls: string[];
  errorMessage: string | null;
}

export interface EvidenceManifest {
  schemaVersion: string;
  acquisitionId: string;
  acquisitionStartTime: string;
  acquisitionEndTime: string;
  totalDurationMs: number;
  target: {
    originalUrl: string;
    finalUrl: string;
    redirectCount: number;
  };
  operator: {
    notes: string;
    purpose: string;
  };
  environment: {
    toolVersion: string;
    nodeVersion: string;
    operatingSystem: string;
    hostname: string;
    timezone: string;
    localSystemTime: string;
  };
  captureConfig: {
    maxRedirects: number;
    timeoutMs: number;
    browserCaptureEnabled: boolean;
    videoEnabled: boolean;
    customHeaders: Record<string, string>;
    httpUserAgent: string;
  };
  artifacts: EvidenceArtifact[];
  masterHash: {
    algorithm: string;
    value: string;
    computationMethod: string;
  };
  timestampProof: TimestampProof | null;
  captureResults: {
    httpCapture: HttpCaptureResult | null;
    browserCapture: {
      originalUrl: string;
      finalUrl: string;
      pageTitle: string;
      networkRequests: BrowserNetworkEntry[];
      browserMetadata: BrowserMetadata;
    } | null;
  };
  disclaimer: string;
}

export interface CaptureRequest {
  url: string;
  maxRedirects?: number;
  timeoutMs?: number;
  browserCapture?: boolean;
  recordVideo?: boolean;
  generateZip?: boolean;
  generatePdf?: boolean;
  customHeaders?: Record<string, string>;
  operatorNotes?: string;
  purpose?: string;
}

export interface CaptureResponse {
  success: boolean;
  acquisitionId: string;
  acquisitionPath: string;
  zipPath: string | null;
  pdfPath: string | null;
  manifest: EvidenceManifest;
  errors: string[];
}

export interface EvidenceListItem {
  acquisitionId: string;
  originalUrl: string;
  finalUrl: string;
  timestamp: string;
  success: boolean;
  artifactCount: number;
  hasZip: boolean;
  hasPdf: boolean;
  hasTimestampProof: boolean;
}

export interface HashVerificationResult {
  overallStatus: 'pass' | 'fail';
  verifiedAt: string;
  files: Array<{
    filename: string;
    expectedHash: string;
    actualHash: string;
    status: 'pass' | 'fail' | 'missing';
  }>;
  masterHash: {
    expectedHash: string;
    actualHash: string;
    status: 'pass' | 'fail';
  };
}

export interface TimestampVerificationResult {
  status: 'verified' | 'pending' | 'invalid' | 'error';
  verifiedAt: string;
  stampedHash: string;
  bitcoinBlock: {
    height: number;
    timestamp: string;
    hash: string;
  } | null;
  attestations: Array<{
    type: string;
    timestamp: string;
    details: string;
  }>;
  errorMessage: string | null;
}

