# EvidenTrace Evidence Model

This document describes the evidence model used by EvidenTrace, including the manifest structure, artifact types, and the evidentiary rationale behind each component.

## Manifest Schema

The `manifest.json` file is the master document that ties all evidence artifacts together. It follows a structured schema designed for both machine processing and human readability.

### Schema Version

```json
{
  "schemaVersion": "1.0.0"
}
```

The schema version enables forward compatibility as the format evolves.

### Acquisition Identification

```json
{
  "acquisitionId": "2025-11-30T12-00-00Z_abc123",
  "acquisitionStartTime": "2025-11-30T12:00:00.000Z",
  "acquisitionEndTime": "2025-11-30T12:00:15.000Z",
  "totalDurationMs": 15000
}
```

- **acquisitionId**: Unique identifier combining UTC timestamp and random suffix
- **Timestamps**: ISO 8601 UTC format for unambiguous temporal reference
- **Duration**: Total capture time for performance auditing

### Target Information

```json
{
  "target": {
    "originalUrl": "https://example.com/page",
    "finalUrl": "https://www.example.com/page/",
    "redirectCount": 2
  }
}
```

**Evidentiary Purpose**: Documents the exact URL requested and where it ultimately resolved, essential for establishing what content was actually captured.

### Operator Information

```json
{
  "operator": {
    "notes": "Captured for litigation case #12345",
    "purpose": "Legal hold evidence preservation"
  }
}
```

**Evidentiary Purpose**: Provides context for the capture, supporting chain of custody documentation.

### Environment Information

```json
{
  "environment": {
    "toolVersion": "1.0.0",
    "nodeVersion": "v20.10.0",
    "operatingSystem": "win32 x64",
    "hostname": "WORKSTATION-01",
    "timezone": "America/New_York",
    "localSystemTime": "Sun Nov 30 2025 07:00:00 GMT-0500"
  }
}
```

**Evidentiary Purpose**: Documents the capture environment for reproducibility analysis and to establish the conditions under which evidence was collected.

### Capture Configuration

```json
{
  "captureConfig": {
    "maxRedirects": 10,
    "timeoutMs": 30000,
    "browserCaptureEnabled": true,
    "videoEnabled": false,
    "customHeaders": {},
    "httpUserAgent": "EvidenTrace/1.0.0"
  }
}
```

**Evidentiary Purpose**: Records the exact parameters used for capture, enabling assessment of whether the capture methodology was appropriate and reproducible.

### Artifacts

```json
{
  "artifacts": [
    {
      "filename": "raw-http.html",
      "description": "Raw HTML response from HTTP capture",
      "mimeType": "text/html",
      "sizeBytes": 45678,
      "sha256": "abc123...",
      "createdAt": "2025-11-30T12:00:05.000Z",
      "evidentiaryPurpose": "Captures the unmodified server response..."
    }
  ]
}
```

Each artifact includes:
- **filename**: Relative path within the acquisition directory
- **description**: Human-readable description
- **mimeType**: MIME type for proper handling
- **sizeBytes**: File size for integrity verification
- **sha256**: Cryptographic hash for tamper detection
- **createdAt**: Timestamp of artifact creation
- **evidentiaryPurpose**: Explanation of the artifact's evidentiary value

### Cryptographic Integrity

```json
{
  "masterHash": {
    "algorithm": "SHA256",
    "value": "def456...",
    "computationMethod": "SHA256 of concatenated artifact hashes in manifest order"
  }
}
```

**Evidentiary Purpose**: The master hash provides a single value that can verify the integrity of the entire evidence bundle.

### Timestamp Proof

```json
{
  "timestampProof": {
    "type": "opentimestamps",
    "proofFile": "manifest.json.ots",
    "stampedHash": "def456...",
    "status": "pending",
    "requestedAt": "2025-11-30T12:00:14.000Z",
    "blockHeight": null,
    "transactionId": null,
    "calendarUrls": [
      "https://a.pool.opentimestamps.org",
      "https://b.pool.opentimestamps.org"
    ],
    "errorMessage": null
  }
}
```

**Evidentiary Purpose**: Provides blockchain-anchored proof that the evidence existed at a specific point in time, independent of any single authority.

### Capture Results

The manifest embeds the full capture results for reference:

```json
{
  "captureResults": {
    "httpCapture": {
      "originalUrl": "...",
      "finalUrl": "...",
      "redirectChain": [...],
      "finalStatusCode": 200,
      "finalHeaders": {...}
    },
    "browserCapture": {
      "originalUrl": "...",
      "finalUrl": "...",
      "pageTitle": "Example Page",
      "networkRequests": [...],
      "browserMetadata": {...}
    }
  }
}
```

### Legal Disclaimer

```json
{
  "disclaimer": "EvidenTrace is a technical evidence capture tool..."
}
```

Clearly states the limitations of the tool to prevent misrepresentation of its capabilities.

## Artifact Types

### 1. raw-http.html

**Content**: Unmodified HTML response from the HTTP capture engine.

**Evidentiary Value**:
- Shows exactly what the server returned
- Useful for detecting cloaking (different content for bots vs. users)
- Preserves server-side rendering before JavaScript execution
- Can reveal hidden content, comments, or metadata

### 2. raw-http-headers.json

**Content**: Complete HTTP response headers from the final response.

**Evidentiary Value**:
- Server identification (Server header)
- Content metadata (Content-Type, Content-Length)
- Caching directives (Cache-Control, Expires)
- Security headers (CSP, X-Frame-Options)
- Custom headers that may indicate technology stack

### 3. redirect-chain.json

**Content**: Array of redirect hops with full metadata.

**Evidentiary Value**:
- Documents the complete path from original URL to final destination
- Reveals intermediate servers (CDNs, load balancers, tracking redirects)
- Captures timing information for each hop
- Shows HTTP status codes indicating redirect type (301, 302, 307, 308)

### 4. screenshot.png

**Content**: Full-page screenshot rendered by Chromium.

**Evidentiary Value**:
- Visual representation of what a user would see
- Captures rendered text, images, and layout
- Includes dynamically loaded content
- Provides intuitive evidence for non-technical audiences

### 5. browser-dom.html

**Content**: DOM snapshot after JavaScript execution.

**Evidentiary Value**:
- Shows the page structure after client-side rendering
- Captures dynamically generated content
- Preserves element attributes and structure
- Enables text extraction and analysis

### 6. screen-capture.webm (optional)

**Content**: Video recording of page load.

**Evidentiary Value**:
- Shows temporal sequence of page rendering
- Captures animations, transitions, and dynamic content
- Documents load behavior and timing
- Useful for capturing ephemeral content

### 7. logs.json

**Content**: Detailed operation log with timestamps.

**Evidentiary Value**:
- Provides audit trail of capture operations
- Documents exact sequence of events
- Records any errors or anomalies
- Supports chain of custody documentation

### 8. manifest.json.ots

**Content**: OpenTimestamps proof file.

**Evidentiary Value**:
- Cryptographic proof of existence at a point in time
- Anchored to Bitcoin blockchain
- Independently verifiable
- Does not rely on any single authority

### 9. summary.pdf

**Content**: Human-readable summary document.

**Evidentiary Value**:
- Formatted for legal proceedings
- Includes key metadata and redirect chain
- Contains verification instructions
- Suitable for printing and filing

### 10. [acquisition-id].zip

**Content**: Complete evidence bundle archive.

**Evidentiary Value**:
- Self-contained package for transfer
- Preserves directory structure
- Simplifies evidence handling
- Enables secure archival

## Redirect Chain Structure

Each hop in the redirect chain contains:

```json
{
  "requestUrl": "https://example.com",
  "statusCode": 301,
  "statusMessage": "Moved Permanently",
  "headers": {
    "location": "https://www.example.com/",
    "server": "nginx",
    "date": "Sun, 30 Nov 2025 12:00:00 GMT"
  },
  "locationHeader": "https://www.example.com/",
  "requestTimestamp": "2025-11-30T12:00:00.000Z",
  "responseTimestamp": "2025-11-30T12:00:00.150Z",
  "durationMs": 150,
  "bodySize": 0,
  "method": "GET"
}
```

**Evidentiary Significance**:
- **Status codes**: 301 (permanent) vs 302 (temporary) redirects have different legal implications
- **Timestamps**: Precise timing can reveal server behavior
- **Headers**: May contain evidence of CDN, hosting, or technology
- **Duration**: Network latency information

## Hash Verification Process

### Individual File Verification

```
For each artifact in manifest.artifacts:
    actual_hash = SHA256(file_contents)
    expected_hash = artifact.sha256
    assert actual_hash == expected_hash
```

### Master Hash Verification

```
hash_list = []
For each artifact in manifest.artifacts (in order):
    hash_list.append(artifact.sha256)

concatenated = join(hash_list, "")
actual_master = SHA256(concatenated)
expected_master = manifest.masterHash.value
assert actual_master == expected_master
```

## Timestamp Verification Process

### Using OpenTimestamps Client

```bash
# Install client
pip install opentimestamps-client

# Verify proof
ots verify manifest.json.ots

# Expected output (when confirmed):
# Success! Bitcoin block 123456 attests data existed as of ...
```

### Proof Structure

The .ots file contains:
1. Magic bytes identifying the file format
2. Hash algorithm indicator (SHA256)
3. The stamped hash value
4. Calendar server attestations
5. Bitcoin transaction merkle path (when confirmed)

## Best Practices for Evidence Handling

### Collection

1. Document the purpose before capture
2. Use consistent capture settings
3. Capture multiple times if content is dynamic
4. Record operator identity and authorization

### Storage

1. Store evidence bundles on write-once media when possible
2. Maintain access logs for evidence directories
3. Create redundant copies in separate locations
4. Preserve original ZIP bundles

### Verification

1. Verify hashes immediately after capture
2. Re-verify before presenting as evidence
3. Document all verification activities
4. Use independent tools for verification

### Chain of Custody

1. Record all transfers of evidence
2. Document storage conditions
3. Maintain verification logs
4. Note any anomalies or concerns

