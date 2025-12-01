import { Link } from 'react-router-dom';
import { getFileUrl } from '../api';
import type { CaptureResponse } from '../types';
import './CaptureResult.css';

interface CaptureResultProps {
  result: CaptureResponse;
  onNewCapture: () => void;
}

export function CaptureResult({ result, onNewCapture }: CaptureResultProps) {
  const { manifest } = result;
  const redirectChain = manifest.captureResults.httpCapture?.redirectChain || [];

  return (
    <div className="capture-result">
      <div className="result-header card">
        <div className="result-status">
          {result.success ? (
            <>
              <span className="status-icon success">✓</span>
              <h3>Capture Successful</h3>
            </>
          ) : (
            <>
              <span className="status-icon warning">⚠</span>
              <h3>Capture Completed with Warnings</h3>
            </>
          )}
        </div>
        
        <div className="result-meta">
          <div className="meta-item">
            <span className="label">Acquisition ID:</span>
            <code>{result.acquisitionId}</code>
          </div>
          <div className="meta-item">
            <span className="label">Duration:</span>
            <span>{manifest.totalDurationMs}ms</span>
          </div>
          <div className="meta-item">
            <span className="label">Artifacts:</span>
            <span>{manifest.artifacts.length} files</span>
          </div>
        </div>

        <div className="result-actions">
          <Link to={`/evidence/${result.acquisitionId}`} className="btn-primary">
            View Details
          </Link>
          <button onClick={onNewCapture} className="btn-secondary">
            New Capture
          </button>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="result-errors card">
          <h4>Warnings</h4>
          <ul>
            {result.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="result-summary">
        <div className="summary-section card">
          <h4>Target</h4>
          <div className="summary-row">
            <span className="label">Original URL:</span>
            <a href={manifest.target.originalUrl} target="_blank" rel="noopener noreferrer">
              {manifest.target.originalUrl}
            </a>
          </div>
          <div className="summary-row">
            <span className="label">Final URL:</span>
            <a href={manifest.target.finalUrl} target="_blank" rel="noopener noreferrer">
              {manifest.target.finalUrl}
            </a>
          </div>
        </div>

        {redirectChain.length > 0 && (
          <div className="summary-section card">
            <h4>Redirect Chain ({redirectChain.length - 1} redirect{redirectChain.length !== 2 ? 's' : ''})</h4>
            <div className="mini-redirect-chain">
              {redirectChain.map((hop, i) => (
                <div key={i} className="mini-hop">
                  <span className={`status status-${Math.floor(hop.statusCode / 100)}xx`}>
                    {hop.statusCode}
                  </span>
                  <span className="hop-url" title={hop.requestUrl}>
                    {truncateUrl(hop.requestUrl, 60)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-section card">
          <h4>Cryptographic Integrity</h4>
          <div className="summary-row">
            <span className="label">Master Hash:</span>
            <code>{manifest.masterHash.value.substring(0, 32)}...</code>
          </div>
          {manifest.timestampProof && (
            <div className="summary-row">
              <span className="label">Timestamp:</span>
              <span className={`badge badge-${manifest.timestampProof.status === 'pending' ? 'warning' : 'success'}`}>
                {manifest.timestampProof.status}
              </span>
            </div>
          )}
        </div>

        <div className="summary-section card">
          <h4>Quick Downloads</h4>
          <div className="download-grid">
            {result.zipPath && (
              <a
                href={getFileUrl(result.acquisitionId, `${result.acquisitionId}.zip`)}
                download
                className="download-item"
              >
                <span className="download-icon">📦</span>
                <span>ZIP Bundle</span>
              </a>
            )}
            {result.pdfPath && (
              <a
                href={getFileUrl(result.acquisitionId, 'summary.pdf')}
                download
                className="download-item"
              >
                <span className="download-icon">📄</span>
                <span>PDF Summary</span>
              </a>
            )}
            <a
              href={getFileUrl(result.acquisitionId, 'manifest.json')}
              download
              className="download-item"
            >
              <span className="download-icon">📋</span>
              <span>Manifest</span>
            </a>
            {manifest.captureConfig.browserCaptureEnabled && (
              <a
                href={getFileUrl(result.acquisitionId, 'screenshot.png')}
                download
                className="download-item"
              >
                <span className="download-icon">🖼️</span>
                <span>Screenshot</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {manifest.captureConfig.browserCaptureEnabled && (
        <div className="screenshot-preview card">
          <h4>Screenshot Preview</h4>
          <div className="preview-container">
            <img
              src={getFileUrl(result.acquisitionId, 'screenshot.png')}
              alt="Captured page screenshot"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

