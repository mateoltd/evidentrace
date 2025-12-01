/**
 * EvidenTrace API Client
 */

import type {
  CaptureRequest,
  CaptureResponse,
  EvidenceListItem,
  EvidenceManifest,
  HashVerificationResult,
  TimestampVerificationResult,
} from './types';

const API_BASE = 'http://127.0.0.1:3000/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function captureUrl(request: CaptureRequest): Promise<CaptureResponse> {
  const response = await fetch(`${API_BASE}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<CaptureResponse>(response);
}

export async function listEvidence(): Promise<EvidenceListItem[]> {
  const response = await fetch(`${API_BASE}/evidence`);
  return handleResponse<EvidenceListItem[]>(response);
}

export async function getManifest(acquisitionId: string): Promise<EvidenceManifest> {
  const response = await fetch(`${API_BASE}/evidence/${acquisitionId}/manifest`);
  return handleResponse<EvidenceManifest>(response);
}

export function getFileUrl(acquisitionId: string, filename: string): string {
  return `${API_BASE}/evidence/${acquisitionId}/files/${encodeURIComponent(filename)}`;
}

export async function verifyHashes(acquisitionId: string): Promise<HashVerificationResult> {
  const response = await fetch(`${API_BASE}/verify/hashes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acquisitionId }),
  });
  return handleResponse<HashVerificationResult>(response);
}

export async function verifyTimestamp(acquisitionId: string): Promise<TimestampVerificationResult> {
  const response = await fetch(`${API_BASE}/verify/ots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acquisitionId }),
  });
  return handleResponse<TimestampVerificationResult>(response);
}

