import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listEvidence, verifyHashes, verifyTimestamp } from '../api';
import type { EvidenceListItem, HashVerificationResult, TimestampVerificationResult } from '../types';
import './EvidenceListPage.css';

export function EvidenceListPage() {
  const [evidence, setEvidence] = useState<EvidenceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    id: string;
    type: 'hash' | 'timestamp';
    result: HashVerificationResult | TimestampVerificationResult;
  } | null>(null);

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const data = await listEvidence();
      setEvidence(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHashes = async (id: string) => {
    try {
      setVerifying(id);
      const result = await verifyHashes(id);
      setVerificationResult({ id, type: 'hash', result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyTimestamp = async (id: string) => {
    try {
      setVerifying(id);
      const result = await verifyTimestamp(id);
      setVerificationResult({ id, type: 'timestamp', result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="evidence-list-page">
        <h1 className="page-title">Evidence Archive</h1>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading evidence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evidence-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidence Archive</h1>
          <p className="page-subtitle">
            {evidence.length} acquisition{evidence.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <button onClick={loadEvidence} className="btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {verificationResult && (
        <div className="verification-modal" onClick={() => setVerificationResult(null)}>
          <div className="verification-content card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="card-title">
                {verificationResult.type === 'hash' ? 'Hash Verification' : 'Timestamp Verification'}
              </h3>
              <button className="btn-secondary" onClick={() => setVerificationResult(null)}>
                Close
              </button>
            </div>
            
            {verificationResult.type === 'hash' && (
              <HashVerificationDisplay result={verificationResult.result as HashVerificationResult} />
            )}
            
            {verificationResult.type === 'timestamp' && (
              <TimestampVerificationDisplay result={verificationResult.result as TimestampVerificationResult} />
            )}
          </div>
        </div>
      )}

      {evidence.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📁</div>
          <h3>No Evidence Captured</h3>
          <p>Start by capturing evidence from a URL on the Capture page.</p>
          <Link to="/" className="btn-primary">Go to Capture</Link>
        </div>
      ) : (
        <div className="evidence-table-wrapper">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Acquisition ID</th>
                <th>URL</th>
                <th>Date</th>
                <th>Artifacts</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item.acquisitionId}>
                  <td>
                    <Link to={`/evidence/${item.acquisitionId}`} className="acquisition-link">
                      {item.acquisitionId.substring(0, 25)}...
                    </Link>
                  </td>
                  <td>
                    <span className="url-cell" title={item.originalUrl}>
                      {truncateUrl(item.originalUrl)}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(item.timestamp)}</td>
                  <td>{item.artifactCount}</td>
                  <td>
                    <div className="status-badges">
                      {item.hasZip && <span className="badge badge-info">ZIP</span>}
                      {item.hasPdf && <span className="badge badge-info">PDF</span>}
                      {item.hasTimestampProof && <span className="badge badge-success">OTS</span>}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => handleVerifyHashes(item.acquisitionId)}
                        disabled={verifying === item.acquisitionId}
                      >
                        {verifying === item.acquisitionId ? (
                          <span className="spinner"></span>
                        ) : (
                          'Verify Hash'
                        )}
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => handleVerifyTimestamp(item.acquisitionId)}
                        disabled={verifying === item.acquisitionId || !item.hasTimestampProof}
                      >
                        Verify OTS
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HashVerificationDisplay({ result }: { result: HashVerificationResult }) {
  return (
    <div className="verification-display">
      <div className={`verification-status ${result.overallStatus}`}>
        <span className="status-icon">{result.overallStatus === 'pass' ? '✓' : '✗'}</span>
        <span>{result.overallStatus === 'pass' ? 'All Hashes Valid' : 'Hash Mismatch Detected'}</span>
      </div>
      
      <p className="verification-time text-muted">
        Verified at: {new Date(result.verifiedAt).toLocaleString()}
      </p>
      
      <div className="file-verification-list">
        <h4>File Hashes</h4>
        {result.files.map((file) => (
          <div key={file.filename} className={`file-row ${file.status}`}>
            <span className="file-status">
              {file.status === 'pass' ? '✓' : file.status === 'missing' ? '?' : '✗'}
            </span>
            <span className="file-name">{file.filename}</span>
            <span className={`file-badge badge-${file.status === 'pass' ? 'success' : 'error'}`}>
              {file.status}
            </span>
          </div>
        ))}
      </div>
      
      <div className="master-hash-section">
        <h4>Master Hash</h4>
        <div className={`master-hash-row ${result.masterHash.status}`}>
          <span className="hash-label">Expected:</span>
          <code>{result.masterHash.expectedHash.substring(0, 32)}...</code>
        </div>
        <div className={`master-hash-row ${result.masterHash.status}`}>
          <span className="hash-label">Actual:</span>
          <code>{result.masterHash.actualHash.substring(0, 32)}...</code>
        </div>
        <div className={`master-status badge-${result.masterHash.status === 'pass' ? 'success' : 'error'}`}>
          {result.masterHash.status === 'pass' ? 'Match' : 'Mismatch'}
        </div>
      </div>
    </div>
  );
}

function TimestampVerificationDisplay({ result }: { result: TimestampVerificationResult }) {
  const statusLabels = {
    verified: 'Verified on Bitcoin Blockchain',
    pending: 'Pending Confirmation',
    invalid: 'Invalid Proof',
    error: 'Verification Error',
  };

  const statusIcons = {
    verified: '✓',
    pending: '⏳',
    invalid: '✗',
    error: '⚠',
  };

  return (
    <div className="verification-display">
      <div className={`verification-status ${result.status}`}>
        <span className="status-icon">{statusIcons[result.status]}</span>
        <span>{statusLabels[result.status]}</span>
      </div>
      
      <p className="verification-time text-muted">
        Verified at: {new Date(result.verifiedAt).toLocaleString()}
      </p>
      
      <div className="timestamp-details">
        <div className="detail-row">
          <span className="detail-label">Stamped Hash:</span>
          <code>{result.stampedHash.substring(0, 32)}...</code>
        </div>
        
        {result.bitcoinBlock && (
          <>
            <div className="detail-row">
              <span className="detail-label">Block Height:</span>
              <span>{result.bitcoinBlock.height}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Block Time:</span>
              <span>{new Date(result.bitcoinBlock.timestamp).toLocaleString()}</span>
            </div>
          </>
        )}
        
        {result.errorMessage && (
          <div className="error-message">
            {result.errorMessage}
          </div>
        )}
        
        {result.attestations.length > 0 && (
          <div className="attestations">
            <h4>Attestations</h4>
            {result.attestations.map((att, i) => (
              <div key={i} className="attestation-row">
                <span className="att-type">{att.type}</span>
                <span className="att-details">{att.details}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

