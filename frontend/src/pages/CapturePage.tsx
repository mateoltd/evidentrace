import { useState } from 'react';
import { CaptureForm } from '../components/CaptureForm';
import { CaptureResult } from '../components/CaptureResult';
import type { CaptureResponse } from '../types';
import './CapturePage.css';

export function CapturePage() {
  const [result, setResult] = useState<CaptureResponse | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureStart = () => {
    setIsCapturing(true);
    setResult(null);
  };

  const handleCaptureComplete = (response: CaptureResponse) => {
    setResult(response);
    setIsCapturing(false);
  };

  const handleCaptureError = () => {
    setIsCapturing(false);
  };

  const handleNewCapture = () => {
    setResult(null);
  };

  return (
    <div className="capture-page">
      <h1 className="page-title">Evidence Capture</h1>
      <p className="page-subtitle">
        Capture cryptographically verifiable evidence of web content with full redirect tracing
      </p>

      <div className="capture-layout">
        <div className="capture-form-section">
          <CaptureForm
            onCaptureStart={handleCaptureStart}
            onCaptureComplete={handleCaptureComplete}
            onCaptureError={handleCaptureError}
            disabled={isCapturing}
          />
        </div>

        <div className="capture-result-section">
          {isCapturing && (
            <div className="capture-progress card">
              <div className="progress-content">
                <div className="spinner"></div>
                <div className="progress-text">
                  <h3>Capturing Evidence...</h3>
                  <p className="text-muted">
                    Performing HTTP capture, browser rendering, and cryptographic hashing.
                    This may take a moment.
                  </p>
                </div>
              </div>
              <div className="progress-steps">
                <div className="progress-step active">
                  <span className="step-icon">1</span>
                  <span>HTTP Capture</span>
                </div>
                <div className="progress-step">
                  <span className="step-icon">2</span>
                  <span>Browser Render</span>
                </div>
                <div className="progress-step">
                  <span className="step-icon">3</span>
                  <span>Hash & Timestamp</span>
                </div>
              </div>
            </div>
          )}

          {result && (
            <CaptureResult result={result} onNewCapture={handleNewCapture} />
          )}

          {!isCapturing && !result && (
            <div className="capture-info card">
              <h3>How It Works</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">📡</div>
                  <div className="info-content">
                    <h4>HTTP Capture</h4>
                    <p>Raw protocol-level capture with full redirect chain tracking and header preservation.</p>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">🌐</div>
                  <div className="info-content">
                    <h4>Browser Render</h4>
                    <p>Full-page screenshot and DOM snapshot using headless Chromium browser.</p>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">🔐</div>
                  <div className="info-content">
                    <h4>Cryptographic Hashing</h4>
                    <p>SHA256 hashes for all artifacts with master hash for integrity verification.</p>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon">⏱️</div>
                  <div className="info-content">
                    <h4>OpenTimestamps</h4>
                    <p>Blockchain-anchored timestamp proof for independent temporal verification.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

