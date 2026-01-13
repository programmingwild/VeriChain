# VeriChain - Decentralized Proof-of-Achievement

> **Public, append-only truth for achievements — not an app.**

VeriChain is a decentralized credential verification system where authorized institutions issue **Soulbound (non-transferable) NFT credentials** to recipients, and anyone can instantly verify those credentials on-chain without intermediaries.

## 🎯 Core Features

- **Soulbound Credentials**: Non-transferable NFTs that permanently bind to a recipient's wallet
- **Institution Authorization**: Only authorized institution wallets can issue credentials
- **On-Chain Verification**: Anyone can verify credentials directly from the blockchain
- **Revocable Credentials**: Issuers can revoke credentials when needed
- **IPFS Metadata**: Credential details stored on decentralized IPFS
- **QR Code Verification**: Generate QR codes for instant mobile verification

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌─────────────────────┐    ┌─────────────────────────┐     │
│  │  Verification Page  │    │  Institution Dashboard  │     │
│  └─────────────────────┘    └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   BLOCKCHAIN    │  │    BACKEND      │  │      IPFS       │
│  (Source of     │  │  (Stateless     │  │   (Metadata     │
│   Truth)        │  │   Helper)       │  │    Storage)     │
│                 │  │                 │  │                 │
│ • Credentials   │  │ • IPFS Upload   │  │ • JSON Metadata │
│ • Authorization │  │ • QR Codes      │  │ • Images        │
│ • Verification  │  │ • Signatures    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Key Principles:**
- Blockchain = Source of Truth
- Backend = Stateless Helper (no credential storage)
- Frontend = Thin Client
- No off-chain credential authority
- No transferability under any condition

## 📁 Project Structure

```
verichain/
├── contracts/
│   └── VeriChainCredential.sol    # Soulbound ERC-721 contract
├── scripts/
│   └── deploy.js                  # Deployment script
├── test/
│   └── verichain.test.js          # Comprehensive tests
├── backend/
│   ├── server.js                  # Express API server
│   ├── ipfs.js                    # IPFS/Pinata integration
│   └── package.json
├── frontend/
│   ├── pages/
│   │   ├── index.js               # Verification page
│   │   └── issue.js               # Institution dashboard
│   ├── components/
│   │   ├── Header.js
│   │   └── CredentialCard.js
│   ├── utils/
│   │   └── contract.js            # Blockchain utilities
│   └── package.json
├── hardhat.config.js
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MetaMask wallet
- Pinata account (for IPFS)

### 1. Install Dependencies

```bash
# Root dependencies (Hardhat + Solidity)
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```env
# Deployment
PRIVATE_KEY=your_wallet_private_key

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

### 3. Compile Smart Contract

```bash
npm run compile
```

### 4. Run Tests

```bash
npm run test
```

### 5. Deploy Contract

**Local (Hardhat Network):**
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:local
```

**Polygon Amoy Testnet:**
```bash
npm run deploy:amoy
```

**Arbitrum Sepolia Testnet:**
```bash
npm run deploy:arbitrum
```

### 6. Update Frontend Configuration

After deployment, copy the contract address to your frontend:

```bash
# In frontend/.env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_CHAIN_ID=80002  # or 421614 for Arbitrum
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 7. Start Backend

```bash
cd backend
npm start
```

### 8. Start Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` for verification and `http://localhost:3000/issue` for the institution dashboard.

## 📋 Smart Contract Functions

### Institution Management (Owner Only)
```solidity
// Authorize an institution to issue credentials
function authorizeInstitution(address institution) external onlyOwner

// Revoke institution authorization
function revokeInstitution(address institution) external onlyOwner
```

### Credential Issuance (Authorized Institutions Only)
```solidity
// Issue a new credential
function issueCredential(address recipient, string uri) external returns (uint256)

// Revoke a credential (issuer or owner)
function revokeCredential(uint256 tokenId) external
```

### Verification (Anyone)
```solidity
// Verify a credential
function verifyCredential(uint256 tokenId) external view returns (
    bool isValid,
    address issuer,
    address holder,
    uint256 issuedAt
)

// Get all credentials for a wallet
function getCredentialsByHolder(address holder) external view returns (uint256[])

// Check if institution is authorized
function isAuthorizedInstitution(address institution) external view returns (bool)
```

## 🧪 Test Coverage

The test suite covers:

- ✅ Deployment and ownership
- ✅ Institution authorization and revocation
- ✅ Authorized minting
- ✅ Unauthorized minting prevention
- ✅ **Blocked transfers** (soulbound enforcement)
- ✅ Credential revocation
- ✅ Credential verification
- ✅ Edge cases

Run tests:
```bash
npm run test
```

## 🌐 API Endpoints

### Backend (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/ipfs/metadata` | POST | Upload metadata to IPFS |
| `/api/ipfs/image` | POST | Upload image to IPFS |
| `/api/ipfs/:cid` | GET | Fetch from IPFS |
| `/api/verify-signature` | POST | Verify wallet signature |
| `/api/auth/nonce` | GET | Get authentication nonce |
| `/api/qr/generate` | POST | Generate verification QR |
| `/api/qr/wallet/:address` | GET | Generate wallet QR |

## 🔒 Security Considerations

1. **Soulbound Enforcement**: Transfers are blocked at the contract level
2. **Authorization**: Only owner can authorize institutions
3. **Revocation**: Only issuer or owner can revoke credentials
4. **No Backend Storage**: All credential data is on-chain or IPFS
5. **Stateless Backend**: Backend cannot forge credentials

## 📊 Metadata Schema

Credentials use this metadata structure (stored on IPFS):

```json
{
  "name": "Bachelor of Computer Science",
  "description": "Awarded for completing the CS program",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Credential Type", "value": "Bachelor's Degree" },
    { "trait_type": "Issuing Institution", "value": "University of Tech" },
    { "trait_type": "Institution Wallet", "value": "0x..." },
    { "trait_type": "Recipient Wallet", "value": "0x..." },
    { "trait_type": "Recipient Name", "value": "John Doe" },
    { "trait_type": "Issue Date", "value": "2025-01-11T..." },
    { "trait_type": "Revocable", "value": "true" }
  ],
  "properties": {
    "credentialType": "Bachelor's Degree",
    "issuingInstitution": "University of Tech",
    "revocable": true,
    "verichain_version": "1.0.0"
  }
}
```

## 🎭 Demo Flow

1. **Deploy Contract** → Contract owner is set
2. **Authorize Institution** → Owner authorizes an institution wallet
3. **Issue Credential** → Institution mints soulbound NFT to student
4. **Verify Credential** → Anyone verifies via frontend or contract call
5. **Revoke (if needed)** → Issuer/owner revokes compromised credential

## 🔮 Future Enhancements (Out of Scope for MVP)

- Zero-Knowledge selective disclosure
- Multi-signature institution approval
- DAO governance for authorization
- Cross-chain verification bridges
- Batch issuance optimization

## 📜 License

MIT

---

Built with ❤️ for verifiable achievements
