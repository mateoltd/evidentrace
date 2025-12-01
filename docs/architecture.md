# EvidenTrace Architecture

This document describes the technical architecture of EvidenTrace, including module organization, data flows, and design decisions.

## System Overview

EvidenTrace is a local web application consisting of:

1. **Backend**: NestJS (Node.js + TypeScript) server handling capture orchestration, evidence storage, and API endpoints
2. **Frontend**: React + TypeScript single-page application for user interaction
3. **CLI**: Command-line interface for scripted operations

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │    Web UI (React)       │    │    CLI (Node.js)            │ │
│  └───────────┬─────────────┘    └──────────────┬──────────────┘ │
│              │                                  │                │
│              └──────────────┬───────────────────┘                │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   REST API Layer                          │   │
│  │  POST /api/capture    GET /api/evidence    POST /verify   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Service Layer (NestJS)                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ HttpCapture │ │ Browser     │ │ Evidence            │ │   │
│  │  │ Service     │ │ Capture     │ │ Service             │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ Crypto      │ │ Packaging   │ │ Verification        │ │   │
│  │  │ Service     │ │ Service     │ │ Service             │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐ │
│  │ File System   │ │ Playwright    │ │ OpenTimestamps        │ │
│  │ (Evidence)    │ │ (Chromium)    │ │ Calendar Servers      │ │
│  └───────────────┘ └───────────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Module Organization

### Backend Modules

#### CaptureModule
- **HttpCaptureService**: Low-level HTTP client that manually follows redirects, recording each hop with full metadata
- **BrowserCaptureService**: Playwright-based browser automation for rendering, screenshots, and DOM capture
- **CaptureController**: REST API endpoints for initiating captures

#### EvidenceModule
- **EvidenceService**: Manages evidence storage, directory creation, manifest generation, and file persistence

#### CryptoModule
- **CryptoService**: SHA256 hashing, master hash computation, and OpenTimestamps integration

#### PackagingModule
- **PackagingService**: ZIP bundle creation and PDF summary generation

#### VerificationModule
- **VerificationService**: Hash verification and timestamp proof validation
- **VerificationController**: REST API endpoints for verification operations

#### CommonModule
- **EvidenceLogger**: Deterministic logging with UTC timestamps for evidentiary integrity

### Frontend Structure

```
src/
├── pages/
│   ├── CapturePage.tsx       # Main capture interface
│   ├── EvidenceListPage.tsx  # Evidence archive listing
│   └── EvidenceDetailPage.tsx # Detailed evidence view
├── components/
│   ├── CaptureForm.tsx       # URL input and options
│   └── CaptureResult.tsx     # Capture result display
├── api.ts                    # Backend API client
└── types.ts                  # TypeScript type definitions
```

## Data Flow

### Capture Flow

```
1. User submits URL
        │
        ▼
2. CaptureController receives request
        │
        ▼
3. Create acquisition directory
        │
        ▼
4. HttpCaptureService performs HTTP capture
   ├── Send request (no auto-redirect)
   ├── Record response metadata
   ├── If redirect, follow to next URL
   └── Repeat until final response or max redirects
        │
        ▼
5. Save HTTP artifacts (raw HTML, headers, redirect chain)
        │
        ▼
6. BrowserCaptureService performs browser capture (if enabled)
   ├── Launch headless Chromium
   ├── Navigate to URL
   ├── Capture screenshot
   ├── Extract DOM
   └── Record network/console logs
        │
        ▼
7. Generate manifest with metadata
        │
        ▼
8. CryptoService computes hashes
   ├── SHA256 for each artifact
   └── Master hash from all artifact hashes
        │
        ▼
9. CryptoService creates OpenTimestamps proof
   ├── Submit master hash to calendar servers
   └── Save .ots proof file
        │
        ▼
10. PackagingService generates outputs
    ├── PDF summary
    └── ZIP bundle
        │
        ▼
11. Return response with acquisition details
```

### Verification Flow

```
1. User requests verification
        │
        ▼
2. Load manifest from acquisition directory
        │
        ▼
3. Hash Verification:
   ├── Recompute SHA256 for each file
   ├── Compare with manifest hashes
   └── Verify master hash
        │
        ▼
4. Timestamp Verification:
   ├── Load .ots proof file
   ├── Validate proof structure
   └── (Full verification requires Bitcoin blockchain check)
        │
        ▼
5. Log verification results
        │
        ▼
6. Return verification report
```

## Key Design Decisions

### 1. Manual Redirect Following

Instead of using automatic redirect following, the HTTP capture service manually follows each redirect. This ensures:
- Complete visibility into every hop
- Accurate timing for each request/response
- Capture of intermediate headers and responses

### 2. Dual Capture Approach

Two separate capture engines serve different evidentiary purposes:
- **HTTP Capture**: Shows raw server response, useful for detecting cloaking or server-side variations
- **Browser Capture**: Shows rendered content as users would see it, including JavaScript-generated elements

### 3. Master Hash Computation

The master hash is computed as SHA256 of concatenated artifact hashes:
```
masterHash = SHA256(hash1 + hash2 + hash3 + ...)
```

This allows verification of the entire bundle's integrity with a single hash while maintaining individual file verification capability.

### 4. OpenTimestamps Integration

OpenTimestamps provides:
- Decentralized timestamp proofs
- Bitcoin blockchain anchoring
- No dependency on centralized timestamp authorities
- Free service with multiple calendar servers

### 5. Local-Only Operation

The system binds to localhost only, ensuring:
- No exposure to network attacks
- Evidence integrity (no remote tampering)
- Compliance with data handling requirements

### 6. Deterministic Logging

All logs use UTC timestamps in ISO 8601 format, ensuring:
- Consistent temporal ordering
- Timezone-independent verification
- Audit trail integrity

## Security Model

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Remote code execution | URLs treated as data only; no eval/execution |
| Network exposure | Localhost binding; no external interfaces |
| Browser exploitation | Playwright sandboxing; no persistent profiles |
| Timestamp manipulation | OpenTimestamps blockchain anchoring |
| Evidence tampering | Cryptographic hashing; append-only logs |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Trusted Zone (Local)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 EvidenTrace System                   │    │
│  │  • Backend services                                  │    │
│  │  • Evidence storage                                  │    │
│  │  • Cryptographic operations                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 External (Untrusted)                         │
│  • Target websites (captured content)                        │
│  • OpenTimestamps calendar servers                           │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **Browser Instance Reuse**: Single browser instance is maintained across captures to reduce startup overhead
- **Streaming File Operations**: Large files are processed as streams to minimize memory usage
- **Parallel Operations**: Independent operations (e.g., hash computation) can be parallelized
- **Configurable Timeouts**: All network operations have configurable timeouts to prevent hangs

## Extensibility Points

The architecture supports future extensions:

1. **Additional Capture Engines**: New capture methods can be added as services
2. **Alternative Timestamp Services**: The crypto service can be extended for other timestamp providers
3. **Custom Export Formats**: New packaging formats can be added to the packaging service
4. **Authentication**: The API layer can be extended with authentication middleware
5. **Database Storage**: Evidence metadata can be indexed in a database for search capabilities

