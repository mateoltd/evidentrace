# Legal and Forensic Usage Guide

This document provides guidance for lawyers, digital forensics experts, and other professionals on how to use and interpret EvidenTrace outputs in legal or investigative contexts.

## Understanding EvidenTrace's Role

### What EvidenTrace Is

EvidenTrace is a **technical evidence capture tool** that:
- Creates cryptographically verifiable records of web content
- Documents the complete HTTP request/response chain
- Captures visual representations of web pages
- Generates blockchain-anchored timestamp proofs
- Produces comprehensive, machine-readable manifests

### What EvidenTrace Is NOT

EvidenTrace is **NOT**:
- A qualified trust service under eIDAS or similar regulations
- A notarization service
- A legal certification of authenticity
- A substitute for expert testimony
- A guarantee of content authenticity

### Evidentiary Status

The evidentiary value of EvidenTrace outputs depends on:
1. **Chain of custody**: How the evidence was handled from capture to presentation
2. **Capture environment integrity**: Whether the capture system was secure and uncompromised
3. **Applicable legal standards**: Jurisdiction-specific rules for digital evidence
4. **Expert interpretation**: Proper explanation of technical aspects

## Using EvidenTrace Outputs

### For Lawyers

#### Pre-Litigation Preservation

1. **Identify content to preserve**: URLs of relevant web pages
2. **Document authorization**: Record who authorized the capture and why
3. **Capture with context**: Use operator notes to document case reference
4. **Verify immediately**: Run hash verification after capture
5. **Store securely**: Preserve the ZIP bundle in a secure location

#### Presenting Evidence

When presenting EvidenTrace outputs:

1. **Introduce the tool**: Explain what EvidenTrace is and how it works
2. **Establish chain of custody**: Document how evidence was captured, stored, and handled
3. **Demonstrate integrity**: Show hash verification results
4. **Explain timestamps**: Describe OpenTimestamps and blockchain anchoring
5. **Acknowledge limitations**: Be clear about what the tool does and doesn't prove

#### Key Documents for Court

| Document | Purpose |
|----------|---------|
| `summary.pdf` | Human-readable overview for court filing |
| `manifest.json` | Technical details for expert review |
| `screenshot.png` | Visual evidence of page appearance |
| `redirect-chain.json` | Documentation of URL resolution |
| `manifest.json.ots` | Timestamp proof file |

### For Digital Forensics Experts

#### Verification Procedures

**Step 1: Integrity Verification**

```bash
# Navigate to evidence directory
cd evidence/2025-11-30T12-00-00Z_abc123/

# Verify file hashes (using any SHA256 tool)
sha256sum raw-http.html
# Compare with sha256 value in manifest.json

# Or use EvidenTrace's built-in verification
# via API or CLI
```

**Step 2: Timestamp Verification**

```bash
# Install OpenTimestamps client
pip install opentimestamps-client

# Verify the timestamp proof
ots verify manifest.json.ots

# For pending proofs, upgrade first
ots upgrade manifest.json.ots
ots verify manifest.json.ots
```

**Step 3: Content Analysis**

1. Compare `raw-http.html` with `browser-dom.html` to identify JavaScript-generated content
2. Analyze `redirect-chain.json` for URL manipulation or tracking
3. Review `raw-http-headers.json` for server information
4. Examine network requests in manifest for third-party resources

#### Writing Expert Reports

When documenting EvidenTrace evidence in forensic reports:

1. **Tool Description**
   - Name, version, and purpose
   - Capture methodology (HTTP client + browser rendering)
   - Cryptographic methods (SHA256, OpenTimestamps)

2. **Evidence Handling**
   - How evidence was received
   - Verification steps performed
   - Any anomalies observed

3. **Technical Findings**
   - Hash verification results
   - Timestamp verification status
   - Content analysis observations

4. **Limitations**
   - Tool limitations
   - Evidence handling gaps
   - Interpretation caveats

### For Investigators

#### Best Practices

1. **Plan captures**: Document investigation purpose before capture
2. **Use consistent settings**: Maintain standard configuration across captures
3. **Capture promptly**: Web content can change or disappear
4. **Capture multiple times**: For dynamic content, capture at different times
5. **Preserve everything**: Keep all artifacts, including logs

#### Documentation Requirements

For each capture, document:
- [ ] Date and time of capture
- [ ] Person performing capture
- [ ] Authorization for capture
- [ ] Investigation/case reference
- [ ] Purpose of capture
- [ ] Any anomalies observed
- [ ] Storage location of evidence

## Interpreting Evidence

### Redirect Chains

**What They Show**:
- How a URL resolves through various servers
- Intermediate tracking or analytics redirects
- CDN or load balancer routing
- URL shortener resolutions

**Legal Significance**:
- Establishes the path from claimed URL to actual content
- May reveal third-party involvement
- Documents server-side behavior

**Example Analysis**:
```json
[
  {"statusCode": 301, "requestUrl": "http://example.com", "locationHeader": "https://example.com"},
  {"statusCode": 302, "requestUrl": "https://example.com", "locationHeader": "https://www.example.com/"},
  {"statusCode": 200, "requestUrl": "https://www.example.com/"}
]
```
This shows: HTTP to HTTPS upgrade, then www subdomain redirect, then final content.

### HTTP Headers

**Key Headers to Examine**:

| Header | Significance |
|--------|--------------|
| `Server` | Identifies web server software |
| `Date` | Server's timestamp (compare with capture time) |
| `Last-Modified` | When content was last changed |
| `Content-Type` | Type of content served |
| `X-Powered-By` | Technology stack information |
| `Set-Cookie` | Session/tracking information |

### Raw HTML vs. Rendered DOM

**Raw HTML** (`raw-http.html`):
- What the server actually sent
- May contain hidden content
- Shows server-side rendering only

**Rendered DOM** (`browser-dom.html`):
- What appears after JavaScript execution
- Includes dynamically loaded content
- Represents user-visible content

**Differences May Indicate**:
- JavaScript-heavy single-page applications
- Dynamic content loading
- Content personalization
- A/B testing variations

### Timestamps

**Capture Timestamps** (in manifest):
- When EvidenTrace performed the capture
- Based on local system clock
- Should be verified against external sources

**OpenTimestamps Proof**:
- Provides blockchain-anchored proof of existence
- Independent of local system clock
- Verifiable by anyone with the proof file
- May take hours to confirm on Bitcoin blockchain

## Common Questions

### Q: Does EvidenTrace prove the content was authentic?

**A**: No. EvidenTrace proves that certain content was captured at a certain time from a certain URL. It does not prove:
- The content was genuine or unmanipulated at the source
- The website was legitimate
- The content was what a typical user would see

### Q: Can the evidence be tampered with after capture?

**A**: Tampering would be detectable through:
- Hash verification failure
- OpenTimestamps proof mismatch
- Inconsistencies in manifest data

However, if the entire bundle is replaced with a new capture, only the timestamp proof would reveal the discrepancy.

### Q: How long is the timestamp proof valid?

**A**: OpenTimestamps proofs are valid as long as:
- The Bitcoin blockchain exists and is accessible
- The proof file is preserved intact
- The original hash can be recomputed

There is no expiration date.

### Q: What if the website content changed after capture?

**A**: EvidenTrace captures a point-in-time snapshot. The evidence shows what existed at the capture time. To prove content changed, you would need:
- Multiple captures at different times
- Comparison of the captured content
- Documentation of the timeline

### Q: Is EvidenTrace output admissible in court?

**A**: Admissibility depends on:
- Jurisdiction and applicable rules of evidence
- How the evidence is authenticated
- Expert testimony explaining the technology
- Chain of custody documentation

Consult with legal counsel regarding admissibility in your specific case.

## Technical Specifications

### Cryptographic Methods

| Component | Algorithm | Standard |
|-----------|-----------|----------|
| File hashing | SHA-256 | FIPS 180-4 |
| Master hash | SHA-256 | FIPS 180-4 |
| Timestamp | OpenTimestamps | BIP-XXX |

### Browser Environment

| Component | Specification |
|-----------|---------------|
| Engine | Chromium (via Playwright) |
| Rendering | Full JavaScript execution |
| Viewport | Configurable (default 1920x1080) |
| User Agent | Standard Chromium UA |

### Data Formats

| File | Format | Standard |
|------|--------|----------|
| Manifest | JSON | RFC 8259 |
| Timestamps | ISO 8601 | ISO 8601:2019 |
| Screenshots | PNG | ISO/IEC 15948 |
| Video | WebM | WebM Project |
| Archive | ZIP | ISO/IEC 21320-1 |

## Contact and Support

For technical questions about EvidenTrace:
- Review the documentation in `/docs`
- Examine the source code for implementation details
- Test verification procedures in a controlled environment

For legal questions:
- Consult with qualified legal counsel
- Engage digital forensics experts as needed
- Review jurisdiction-specific evidence rules

