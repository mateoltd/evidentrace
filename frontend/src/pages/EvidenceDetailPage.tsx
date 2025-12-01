import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getManifest, getFileUrl, verifyHashes, verifyTimestamp } from '../api';
import type { EvidenceManifest, HashVerificationResult, TimestampVerificationResult } from '../types';
import './EvidenceDetailPage.css';

export function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [manifest, setManifest] = useState<EvidenceManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'redirects' | 'artifacts' | 'crypto'>('overview');
  const [hashResult, setHashResult] = useState<HashVerificationResult | null>(null);
  const [tsResult, setTsResult] = useState<TimestampVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (id) {
      loadManifest(id);
    }
  }, [id]);

  const loadManifest = async (acquisitionId: string) => {
    try {
      setLoading(true);
      const data = await getManifest(acquisitionId);
      setManifest(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load manifest');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHashes = async () => {
    if (!id) return;
    try {
      setVerifying(true);
      const result = await verifyHashes(id);
      setHashResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyTimestamp = async () => {
    if (!id) return;
    try {
      setVerifying(true);
      const result = await verifyTimestamp(id);
      setTsResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="evidence-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="evidence-detail-page">
        <div className="error-state card">
          <h3>Error Loading Evidence</h3>
          <p>{error || 'Evidence not found'}</p>
          <Link to="/evidence" className="btn-primary">Back to List</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="evidence-detail-page">
      <div className="detail-header">
        <Link to="/evidence" className="back-link">← Back to Evidence List</Link>
        <h1 className="page-title">Evidence Details</h1>
        <p className="acquisition-id">{manifest.acquisitionId}</p>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'redirects' ? 'active' : ''}`}
          onClick={() => setActiveTab('redirects')}
        >
          Redirect Chain
        </button>
        <button
          className={`tab ${activeTab === 'artifacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('artifacts')}
        >
          Artifacts
        </button>
        <button
          className={`tab ${activeTab === 'crypto' ? 'active' : ''}`}
          onClick={() => setActiveTab('crypto')}
        >
          Crypto & Timestamp
        </button>
      </div>

      <div className="detail-content">
        {activeTab === 'overview' && (
          <OverviewTab manifest={manifest} id={id!} />
        )}
        {activeTab === 'redirects' && (
          <RedirectsTab manifest={manifest} />
        )}
        {activeTab === 'artifacts' && (
          <ArtifactsTab manifest={manifest} id={id!} />
        )}
        {activeTab === 'crypto' && (
          <CryptoTab
            manifest={manifest}
            hashResult={hashResult}
            tsResult={tsResult}
            verifying={verifying}
            onVerifyHashes={handleVerifyHashes}
            onVerifyTimestamp={handleVerifyTimestamp}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ manifest, id }: { manifest: EvidenceManifest; id: string }) {
  const screenshotUrl = getFileUrl(id, 'screenshot.png');
  
  return (
    <div className="overview-tab">
      <div className="overview-grid">
        <div className="overview-section card">
          <h3>Target</h3>
          <div className="info-row">
            <span className="label">Original URL:</span>
            <a href={manifest.target.originalUrl} target="_blank" rel="noopener noreferrer">
              {manifest.target.originalUrl}
            </a>
          </div>
          <div className="info-row">
            <span className="label">Final URL:</span>
            <a href={manifest.target.finalUrl} target="_blank" rel="noopener noreferrer">
              {manifest.target.finalUrl}
            </a>
          </div>
          <div className="info-row">
            <span className="label">Redirects:</span>
            <span>{manifest.target.redirectCount}</span>
          </div>
        </div>

        <div className="overview-section card">
          <h3>Timestamps</h3>
          <div className="info-row">
            <span className="label">Start (UTC):</span>
            <span>{new Date(manifest.acquisitionStartTime).toISOString()}</span>
          </div>
          <div className="info-row">
            <span className="label">End (UTC):</span>
            <span>{new Date(manifest.acquisitionEndTime).toISOString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Duration:</span>
            <span>{manifest.totalDurationMs}ms</span>
          </div>
          <div className="info-row">
            <span className="label">Local Time:</span>
            <span>{manifest.environment.localSystemTime}</span>
          </div>
        </div>

        <div className="overview-section card">
          <h3>Environment</h3>
          <div className="info-row">
            <span className="label">Tool Version:</span>
            <span>EvidenTrace {manifest.environment.toolVersion}</span>
          </div>
          <div className="info-row">
            <span className="label">Node.js:</span>
            <span>{manifest.environment.nodeVersion}</span>
          </div>
          <div className="info-row">
            <span className="label">OS:</span>
            <span>{manifest.environment.operatingSystem}</span>
          </div>
          <div className="info-row">
            <span className="label">Hostname:</span>
            <span>{manifest.environment.hostname}</span>
          </div>
        </div>

        <div className="overview-section card">
          <h3>Configuration</h3>
          <div className="info-row">
            <span className="label">Max Redirects:</span>
            <span>{manifest.captureConfig.maxRedirects}</span>
          </div>
          <div className="info-row">
            <span className="label">Timeout:</span>
            <span>{manifest.captureConfig.timeoutMs}ms</span>
          </div>
          <div className="info-row">
            <span className="label">Browser Capture:</span>
            <span>{manifest.captureConfig.browserCaptureEnabled ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-row">
            <span className="label">Video:</span>
            <span>{manifest.captureConfig.videoEnabled ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {manifest.captureConfig.browserCaptureEnabled && (
        <div className="screenshot-section card">
          <h3>Screenshot Preview</h3>
          <div className="screenshot-container">
            <img src={screenshotUrl} alt="Page screenshot" />
          </div>
        </div>
      )}

      {manifest.operator.notes && (
        <div className="notes-section card">
          <h3>Operator Notes</h3>
          <p>{manifest.operator.notes}</p>
        </div>
      )}
    </div>
  );
}

function RedirectsTab({ manifest }: { manifest: EvidenceManifest }) {
  const redirectChain = manifest.captureResults.httpCapture?.redirectChain || [];

  if (redirectChain.length === 0) {
    return (
      <div className="redirects-tab">
        <div className="empty-state card">
          <p>No redirect chain data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="redirects-tab">
      <div className="redirect-chain">
        {redirectChain.map((hop, index) => (
          <div key={index} className="redirect-hop card">
            <div className="hop-header">
              <span className="hop-number">Hop {index + 1}</span>
              <span className={`status-code status-${Math.floor(hop.statusCode / 100)}xx`}>
                {hop.statusCode} {hop.statusMessage}
              </span>
            </div>
            
            <div className="hop-url">
              <span className="label">URL:</span>
              <a href={hop.requestUrl} target="_blank" rel="noopener noreferrer">
                {hop.requestUrl}
              </a>
            </div>
            
            {hop.locationHeader && (
              <div className="hop-location">
                <span className="label">Location:</span>
                <code>{hop.locationHeader}</code>
              </div>
            )}
            
            <div className="hop-timing">
              <span>
                <span className="label">Request:</span> {hop.requestTimestamp}
              </span>
              <span>
                <span className="label">Response:</span> {hop.responseTimestamp}
              </span>
              <span>
                <span className="label">Duration:</span> {hop.durationMs}ms
              </span>
            </div>
            
            <details className="hop-headers">
              <summary>Response Headers</summary>
              <pre>{JSON.stringify(hop.headers, null, 2)}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtifactsTab({ manifest, id }: { manifest: EvidenceManifest; id: string }) {
  return (
    <div className="artifacts-tab">
      <div className="artifacts-grid">
        {manifest.artifacts.map((artifact) => (
          <div key={artifact.filename} className="artifact-card card">
            <div className="artifact-header">
              <span className="artifact-icon">
                {getArtifactIcon(artifact.mimeType)}
              </span>
              <div className="artifact-info">
                <h4>{artifact.filename}</h4>
                <p className="text-muted">{artifact.description}</p>
              </div>
            </div>
            
            <div className="artifact-details">
              <div className="detail">
                <span className="label">Type:</span>
                <span>{artifact.mimeType}</span>
              </div>
              <div className="detail">
                <span className="label">Size:</span>
                <span>{formatBytes(artifact.sizeBytes)}</span>
              </div>
              <div className="detail hash">
                <span className="label">SHA256:</span>
                <code title={artifact.sha256}>{artifact.sha256.substring(0, 24)}...</code>
              </div>
            </div>
            
            <div className="artifact-purpose">
              <span className="label">Evidentiary Purpose:</span>
              <p>{artifact.evidentiaryPurpose}</p>
            </div>
            
            <a
              href={getFileUrl(id, artifact.filename)}
              download={artifact.filename}
              className="btn-secondary download-btn"
            >
              Download
            </a>
          </div>
        ))}
      </div>
      
      <div className="bulk-download card">
        <h3>Bulk Download</h3>
        <div className="download-buttons">
          <a
            href={getFileUrl(id, `${manifest.acquisitionId}.zip`)}
            download
            className="btn-primary"
          >
            Download ZIP Bundle
          </a>
          <a
            href={getFileUrl(id, 'summary.pdf')}
            download
            className="btn-secondary"
          >
            Download PDF Summary
          </a>
          <a
            href={getFileUrl(id, 'manifest.json')}
            download
            className="btn-secondary"
          >
            Download Manifest
          </a>
        </div>
      </div>
    </div>
  );
}

function CryptoTab({
  manifest,
  hashResult,
  tsResult,
  verifying,
  onVerifyHashes,
  onVerifyTimestamp,
}: {
  manifest: EvidenceManifest;
  hashResult: HashVerificationResult | null;
  tsResult: TimestampVerificationResult | null;
  verifying: boolean;
  onVerifyHashes: () => void;
  onVerifyTimestamp: () => void;
}) {
  return (
    <div className="crypto-tab">
      <div className="crypto-section card">
        <h3>Master Hash</h3>
        <div className="master-hash-display">
          <div className="hash-info">
            <div className="info-row">
              <span className="label">Algorithm:</span>
              <span>{manifest.masterHash.algorithm}</span>
            </div>
            <div className="info-row">
              <span className="label">Value:</span>
              <code className="full-hash">{manifest.masterHash.value}</code>
            </div>
            <div className="info-row">
              <span className="label">Method:</span>
              <span>{manifest.masterHash.computationMethod}</span>
            </div>
          </div>
          
          <button
            onClick={onVerifyHashes}
            disabled={verifying}
            className="btn-primary"
          >
            {verifying ? <span className="spinner"></span> : 'Verify All Hashes'}
          </button>
        </div>
        
        {hashResult && (
          <div className={`verification-result ${hashResult.overallStatus}`}>
            <div className="result-header">
              <span className="result-icon">
                {hashResult.overallStatus === 'pass' ? '✓' : '✗'}
              </span>
              <span>
                {hashResult.overallStatus === 'pass' 
                  ? 'All hashes verified successfully' 
                  : 'Hash verification failed'}
              </span>
            </div>
            <p className="text-muted">
              Verified at: {new Date(hashResult.verifiedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="crypto-section card">
        <h3>OpenTimestamps Proof</h3>
        {manifest.timestampProof ? (
          <div className="timestamp-display">
            <div className="timestamp-info">
              <div className="info-row">
                <span className="label">Status:</span>
                <span className={`badge badge-${manifest.timestampProof.status === 'pending' ? 'warning' : manifest.timestampProof.status === 'confirmed' ? 'success' : 'error'}`}>
                  {manifest.timestampProof.status}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Proof File:</span>
                <span>{manifest.timestampProof.proofFile}</span>
              </div>
              <div className="info-row">
                <span className="label">Stamped Hash:</span>
                <code>{manifest.timestampProof.stampedHash.substring(0, 32)}...</code>
              </div>
              <div className="info-row">
                <span className="label">Requested At:</span>
                <span>{new Date(manifest.timestampProof.requestedAt).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="label">Calendar Servers:</span>
                <span>{manifest.timestampProof.calendarUrls.join(', ')}</span>
              </div>
            </div>
            
            <button
              onClick={onVerifyTimestamp}
              disabled={verifying}
              className="btn-primary"
            >
              {verifying ? <span className="spinner"></span> : 'Verify Timestamp'}
            </button>
          </div>
        ) : (
          <p className="text-muted">No timestamp proof available for this acquisition.</p>
        )}
        
        {tsResult && (
          <div className={`verification-result ${tsResult.status}`}>
            <div className="result-header">
              <span className="result-icon">
                {tsResult.status === 'verified' ? '✓' : tsResult.status === 'pending' ? '⏳' : '✗'}
              </span>
              <span>
                {tsResult.status === 'verified' && 'Timestamp verified on Bitcoin blockchain'}
                {tsResult.status === 'pending' && 'Timestamp pending confirmation'}
                {tsResult.status === 'invalid' && 'Invalid timestamp proof'}
                {tsResult.status === 'error' && 'Verification error'}
              </span>
            </div>
            {tsResult.errorMessage && (
              <p className="error-text">{tsResult.errorMessage}</p>
            )}
          </div>
        )}
      </div>

      <div className="crypto-section card">
        <h3>How to Verify Independently</h3>
        <div className="verification-instructions">
          <h4>Hash Verification</h4>
          <ol>
            <li>Download all artifact files from the Artifacts tab</li>
            <li>Compute SHA256 hash for each file using your preferred tool</li>
            <li>Compare with hashes in the manifest.json</li>
            <li>Concatenate all hashes and compute SHA256 to verify master hash</li>
          </ol>
          
          <h4>Timestamp Verification</h4>
          <ol>
            <li>Install OpenTimestamps client: <code>pip install opentimestamps-client</code></li>
            <li>Download the .ots proof file</li>
            <li>Run: <code>ots verify manifest.json.ots</code></li>
            <li>The tool will verify against the Bitcoin blockchain</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function getArtifactIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/zip') return '📦';
  if (mimeType === 'application/json') return '📋';
  if (mimeType === 'text/html') return '🌐';
  return '📁';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

