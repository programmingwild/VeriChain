# VeriChain API Documentation

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.verichain.io` (planned)

## Authentication

Currently, the API is open for development. Production deployments should implement:
- API key authentication
- JWT tokens for institution actions
- Request signing for sensitive operations

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per window per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Endpoints

### Health & Status

#### GET /health
Health check with service status.

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "version": "2.0.0",
  "uptime": 3600,
  "services": {
    "ipfs": "connected",
    "server": "running"
  },
  "stats": {
    "localMetadataCount": 10,
    "localImageCount": 5
  }
}
```

#### GET /api/status
API version and environment info.

**Response**
```json
{
  "service": "VeriChain API",
  "version": "2.0.0",
  "environment": "development",
  "timestamp": "2026-01-12T10:30:00.000Z"
}
```

---

### IPFS Operations

#### POST /api/ipfs/metadata
Upload credential metadata to IPFS (or local storage in development).

**Request Body**
```json
{
  "name": "Bachelor of Computer Science",
  "description": "Awarded for completion of undergraduate studies",
  "image": "ipfs://QmImageHash",
  "credentialType": "Degree",
  "issuingInstitution": "MIT",
  "institutionWallet": "0x1234...5678",
  "recipientWallet": "0xabcd...ef12",
  "recipientName": "John Doe",
  "issueDate": "2026-01-15",
  "expirationDate": null,
  "additionalData": {
    "gpa": "3.8",
    "major": "Computer Science"
  }
}
```

**Required Fields**: `name`, `credentialType`, `issuingInstitution`, `recipientWallet`

**Response**
```json
{
  "success": true,
  "ipfsUri": "ipfs://QmXxxx...",
  "ipfsHash": "QmXxxx...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXxxx...",
  "metadataHash": "sha256-hash-for-integrity",
  "metadata": { ... },
  "requestId": "uuid-v4"
}
```

**Errors**
- `400`: Missing required fields or invalid recipientWallet format
- `500`: Internal server error

---

#### POST /api/ipfs/image
Upload a credential image to IPFS.

**Request**
- Content-Type: `multipart/form-data`
- Field: `image` (file)
- Max Size: 5MB
- Allowed Types: JPEG, PNG, GIF, WebP

**Response**
```json
{
  "success": true,
  "ipfsUri": "ipfs://QmImageHash",
  "ipfsHash": "QmImageHash",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmImageHash",
  "requestId": "uuid-v4"
}
```

---

#### GET /api/ipfs/:cid
Fetch metadata from IPFS or local storage.

**Parameters**
- `cid`: IPFS Content Identifier (CID)

**Response**
```json
{
  "success": true,
  "data": { /* credential metadata */ },
  "storage": "ipfs" | "local",
  "requestId": "uuid-v4"
}
```

---

### QR Code Generation

#### POST /api/qr/generate
Generate a QR code for credential verification.

**Request Body**
```json
{
  "tokenId": 123,
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "chainId": 31337,
  "baseUrl": "https://verify.verichain.io"
}
```

**Required Fields**: `tokenId`

**Response**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "verificationUrl": "https://verify.verichain.io?tokenId=123&contract=0x...",
  "tokenId": 123,
  "requestId": "uuid-v4"
}
```

---

### Signature Operations

#### GET /api/signature/challenge
Get a challenge message for wallet authentication.

**Query Parameters**
- `address` (required): Ethereum wallet address
- `action` (optional): Action being authorized (default: "authenticate")

**Response**
```json
{
  "success": true,
  "message": "VeriChain Authentication\n\nAction: authenticate\n...",
  "nonce": "random-hex-nonce",
  "timestamp": 1704988800000,
  "expiresAt": 1704989100000,
  "requestId": "uuid-v4"
}
```

---

#### POST /api/signature/verify
Verify an Ethereum signature.

**Request Body**
```json
{
  "message": "VeriChain Authentication\n...",
  "signature": "0x...",
  "expectedSigner": "0x1234...5678"
}
```

**Response**
```json
{
  "success": true,
  "verified": true,
  "signer": "0x1234...5678",
  "requestId": "uuid-v4"
}
```

---

### Validation

#### GET /api/validate/address/:address
Validate an Ethereum address format.

**Response**
```json
{
  "valid": true,
  "address": "0x1234...5678",
  "checksumAddress": "0x1234...5678",
  "error": null,
  "requestId": "uuid-v4"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "requestId": "uuid-v4"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 403 | Forbidden (CORS, auth) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Request Headers

### Request
| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` for JSON, `multipart/form-data` for files |
| `X-Request-ID` | Optional client-provided request ID for tracing |

### Response
| Header | Description |
|--------|-------------|
| `X-Request-ID` | Unique request identifier for debugging |
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Seconds until rate limit resets |

---

## IPFS Metadata Schema

VeriChain uses a standardized metadata format compatible with OpenSea and other NFT platforms:

```json
{
  "name": "Credential Name",
  "description": "Credential description",
  "image": "ipfs://QmImageHash",
  "external_url": "https://verichain.io/credential/123",
  "attributes": [
    {
      "trait_type": "Credential Type",
      "value": "Degree"
    },
    {
      "trait_type": "Issuing Institution",
      "value": "MIT"
    },
    {
      "trait_type": "Recipient Name",
      "value": "John Doe"
    },
    {
      "trait_type": "Issue Date",
      "value": "2026-01-15",
      "display_type": "date"
    },
    {
      "trait_type": "Expiration Date",
      "value": "2031-01-15",
      "display_type": "date"
    }
  ],
  "properties": {
    "category": "credential",
    "issuer_wallet": "0x...",
    "recipient_wallet": "0x...",
    "credential_hash": "sha256-of-credential-data"
  }
}
```

---

## Examples

### cURL Examples

**Upload Metadata**
```bash
curl -X POST http://localhost:3001/api/ipfs/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bachelor of Science",
    "credentialType": "Degree",
    "issuingInstitution": "MIT",
    "recipientWallet": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  }'
```

**Generate QR Code**
```bash
curl -X POST http://localhost:3001/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"tokenId": 1}'
```

**Validate Address**
```bash
curl http://localhost:3001/api/validate/address/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

### JavaScript Examples

```javascript
// Upload metadata
const response = await fetch('http://localhost:3001/api/ipfs/metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Bachelor of Science',
    credentialType: 'Degree',
    issuingInstitution: 'MIT',
    recipientWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  })
});

const { ipfsUri } = await response.json();
console.log('Metadata URI:', ipfsUri);
```

---

## SDK (Coming Soon)

A JavaScript/TypeScript SDK is planned for easier integration:

```javascript
import { VeriChainClient } from '@verichain/sdk';

const client = new VeriChainClient({
  apiUrl: 'http://localhost:3001',
  contractAddress: '0x...',
  chainId: 31337
});

// Upload and issue in one call
const credential = await client.issueCredential({
  recipient: '0x...',
  name: 'Bachelor of Science',
  type: 'Degree',
  institution: 'MIT'
});

console.log('Token ID:', credential.tokenId);
```
