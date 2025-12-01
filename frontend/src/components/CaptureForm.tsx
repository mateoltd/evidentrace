import { useState } from 'react';
import { captureUrl } from '../api';
import type { CaptureResponse } from '../types';
import './CaptureForm.css';

interface CaptureFormProps {
  onCaptureStart: () => void;
  onCaptureComplete: (response: CaptureResponse) => void;
  onCaptureError: (error: string) => void;
  disabled: boolean;
}

export function CaptureForm({
  onCaptureStart,
  onCaptureComplete,
  onCaptureError,
  disabled,
}: CaptureFormProps) {
  const [url, setUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [browserCapture, setBrowserCapture] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [generateZip, setGenerateZip] = useState(true);
  const [generatePdf, setGeneratePdf] = useState(true);
  const [maxRedirects, setMaxRedirects] = useState(10);
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    setError(null);
    onCaptureStart();

    try {
      const response = await captureUrl({
        url: url.trim(),
        browserCapture,
        recordVideo,
        generateZip,
        generatePdf,
        maxRedirects,
        timeoutMs,
        operatorNotes: operatorNotes.trim() || undefined,
        purpose: purpose.trim() || undefined,
      });
      
      onCaptureComplete(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Capture failed';
      setError(errorMessage);
      onCaptureError(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="capture-form card">
      <h2>New Capture</h2>
      
      <div className="form-group">
        <label htmlFor="url">Target URL</label>
        <input
          type="text"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={disabled}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="purpose">Purpose (optional)</label>
        <input
          type="text"
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g., Legal hold, Investigation"
          disabled={disabled}
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Operator Notes (optional)</label>
        <textarea
          id="notes"
          value={operatorNotes}
          onChange={(e) => setOperatorNotes(e.target.value)}
          placeholder="Any notes about this capture..."
          rows={3}
          disabled={disabled}
        />
      </div>

      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={browserCapture}
            onChange={(e) => setBrowserCapture(e.target.checked)}
            disabled={disabled}
          />
          <span>Browser capture (screenshot & DOM)</span>
        </label>
        
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={recordVideo}
            onChange={(e) => setRecordVideo(e.target.checked)}
            disabled={disabled || !browserCapture}
          />
          <span>Record video</span>
        </label>
        
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={generateZip}
            onChange={(e) => setGenerateZip(e.target.checked)}
            disabled={disabled}
          />
          <span>Generate ZIP bundle</span>
        </label>
        
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={generatePdf}
            onChange={(e) => setGeneratePdf(e.target.checked)}
            disabled={disabled}
          />
          <span>Generate PDF summary</span>
        </label>
      </div>

      <button
        type="button"
        className="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▼' : '▶'} Advanced Options
      </button>

      {showAdvanced && (
        <div className="advanced-options">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxRedirects">Max Redirects</label>
              <input
                type="number"
                id="maxRedirects"
                value={maxRedirects}
                onChange={(e) => setMaxRedirects(parseInt(e.target.value) || 10)}
                min={0}
                max={20}
                disabled={disabled}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="timeout">Timeout (ms)</label>
              <input
                type="number"
                id="timeout"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 30000)}
                min={1000}
                max={120000}
                step={1000}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary submit-btn" disabled={disabled}>
        {disabled ? (
          <>
            <span className="spinner"></span>
            Capturing...
          </>
        ) : (
          'Start Capture'
        )}
      </button>
    </form>
  );
}

