# EvidenTrace

## Digital Evidence Capture System

EvidenTrace is a web application for capturing cryptographically verifiable evidence of web content. It performs HTTP request tracing, browser rendering, screenshot capture, and integrates with OpenTimestamps for blockchain-anchored temporal proofs.

> EvidenTrace is a technical evidence capture tool. It is NOT a qualified trust service and does NOT independently attest to the legal authenticity of captured content. The evidentiary value of outputs depends on the chain of custody, the integrity of the capture environment, and applicable legal standards in the relevant jurisdiction.

## Prerequisites

- **Node.js** 18.x or higher
- **pnpm** 8.x or higher
- **OpenTimestamps client** (optional, for full timestamp verification)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd evidentrace
```

### 2. Install Backend Dependencies

```bash
cd backend
pnpm install
```

### 3. Install Playwright Browsers

```bash
pnpm exec playwright install chromium
```

### 4. Install Frontend Dependencies

```bash
cd ../frontend
pnpm install
```

### 5. (Optional) Install OpenTimestamps Client

For full timestamp verification capabilities:

```bash
pip install opentimestamps-client
```

## Running the Application

### Start the Backend Server

```bash
cd backend
pnpm run start:dev
```

The backend will start at `http://127.0.0.1:3000`

### Start the Frontend Development Server

In a new terminal:

```bash
cd frontend
pnpm run dev
```

The frontend will be available at `http://localhost:5173`

### Production Build

```bash
# Build backend
cd backend
pnpm run build
pnpm run start:prod

# Build frontend
cd frontend
pnpm run build
# Serve the dist/ folder with any static file server
```

## Using the CLI

EvidenTrace includes a command-line interface for scripted captures:

```bash
cd backend

# Capture a URL
pnpm run cli capture https://example.com

# Capture with options
pnpm run cli capture https://example.com --video --notes "Legal hold capture"

# Verify an acquisition
pnpm run cli verify <acquisition-id>

# List all acquisitions
pnpm run cli list

# Show help
pnpm run cli help
```

## Configuration

Configuration is done via environment variables. Create a `.env` file in the `backend/` directory:

```env
# Server port (default: 3000)
PORT=3000

# Evidence storage path (default: ./evidence)
EVIDENCE_ROOT_PATH=./evidence

# Maximum redirects to follow (default: 10)
MAX_REDIRECTS=10

# Default request timeout in milliseconds (default: 30000)
DEFAULT_TIMEOUT_MS=30000

# Maximum response body size in bytes (default: 52428800 = 50MB)
MAX_BODY_SIZE_BYTES=52428800

# OpenTimestamps enabled (default: true)
OTS_ENABLED=true

# OpenTimestamps calendar servers
OTS_CALENDAR_URLS=https://a.pool.opentimestamps.org,https://b.pool.opentimestamps.org

# Browser settings
BROWSER_HEADLESS=true
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080
MAX_VIDEO_LENGTH_MS=30000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/capture` | Initiate a new evidence capture |
| GET | `/api/evidence` | List all acquisitions |
| GET | `/api/evidence/:id/manifest` | Get acquisition manifest |
| GET | `/api/evidence/:id/files/:name` | Download specific artifact |
| POST | `/api/verify/hashes` | Verify file hashes |
| POST | `/api/verify/ots` | Verify OpenTimestamps proof |

### Capture Request Body

```json
{
  "url": "https://example.com",
  "maxRedirects": 10,
  "timeoutMs": 30000,
  "browserCapture": true,
  "recordVideo": false,
  "generateZip": true,
  "generatePdf": true,
  "operatorNotes": "Optional notes",
  "purpose": "Evidence capture"
}
```

## Evidence Bundle Structure

Each acquisition creates a directory with the following structure:

```
evidence/
└── 2025-11-30T12-00-00Z_abc123/
    ├── manifest.json          # Master manifest with all metadata
    ├── raw-http.html          # Raw HTML from HTTP capture
    ├── raw-http-headers.json  # HTTP response headers
    ├── redirect-chain.json    # Full redirect chain
    ├── screenshot.png         # Full-page screenshot
    ├── browser-dom.html       # Rendered DOM snapshot
    ├── screen-capture.webm    # Video recording (if enabled)
    ├── logs.json              # Capture operation logs
    ├── manifest.json.ots      # OpenTimestamps proof
    ├── summary.pdf            # Human-readable summary
    └── <acquisition-id>.zip   # Complete bundle archive
```

## Verifying Evidence

### Hash Verification

1. Download all artifact files
2. Compute SHA256 hash for each file
3. Compare with hashes in `manifest.json`
4. Concatenate all hashes in order and compute SHA256 to verify master hash

### OpenTimestamps Verification

```bash
# Install the client
pip install opentimestamps-client

# Verify the proof
ots verify manifest.json.ots

# The tool will check against the Bitcoin blockchain
```

## Project Structure

```
evidentrace/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── capture/           # Capture engines and controller
│   │   ├── evidence/          # Evidence storage service
│   │   ├── crypto/            # Hashing and timestamps
│   │   ├── packaging/         # ZIP and PDF generation
│   │   ├── verification/      # Verification service
│   │   ├── common/            # Shared utilities
│   │   ├── config/            # Configuration
│   │   └── cli/               # CLI tool
│   └── evidence/              # Evidence storage (gitignored)
├── frontend/                   # React frontend
│   └── src/
│       ├── pages/             # Page components
│       ├── components/        # Reusable components
│       ├── api.ts             # API client
│       └── types.ts           # TypeScript types
└── docs/                       # Documentation
```

## Contributing

Contributions are welcome. Please ensure all changes maintain the evidentiary integrity principles of the system.

