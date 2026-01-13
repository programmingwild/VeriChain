# VeriChain - Decentralized Proof-of-Achievement

Public, append-only truth for achievements — not an app.

VeriChain is a decentralized credential verification system where authorized institutions issue Soulbound (non-transferable) NFT credentials to recipients, and anyone can instantly verify those credentials on-chain without intermediaries.

---

## 🎯 Core Features
- **Soulbound Credentials:** Non-transferable NFTs that permanently bind to a recipient's wallet
- **Institution Authorization:** Only authorized institution wallets can issue credentials
- **On-Chain Verification:** Anyone can verify credentials directly from the blockchain
- **Revocable Credentials:** Issuers can revoke credentials when needed
- **IPFS Metadata:** Credential details stored on decentralized IPFS
- **QR Code Verification:** Generate QR codes for instant mobile verification

---

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

---

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

---

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
```
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
```
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
Visit http://localhost:3000 for verification and http://localhost:3000/issue for the institution dashboard.

---

## 📋 Smart Contract Functions
**Institution Management (Owner Only)**
```solidity
// Authorize an institution to issue credentials
function authorizeInstitution(address institution) external onlyOwner

// Revoke institution authorization
function revokeInstitution(address institution) external onlyOwner
```
**Credential Issuance (Authorized Institutions Only)**
```solidity
// Issue a new credential
function issueCredential(address recipient, string uri) external returns (uint256)

// Revoke a credential (issuer or owner)
function revokeCredential(uint256 tokenId) external
```
**Verification (Anyone)**
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

---

## 🧪 Test Coverage
The test suite covers:
- ✅ Deployment and ownership
- ✅ Institution authorization and revocation
- ✅ Authorized minting
- ✅ Unauthorized minting prevention
- ✅ Blocked transfers (soulbound enforcement)
- ✅ Credential revocation
- ✅ Credential verification
- ✅ Edge cases

Run tests:
```bash
npm run test
```

---

## 🌐 API Endpoints
**Backend (Port 3001)**
| Endpoint                | Method | Description                  |
|------------------------ |--------|------------------------------|
| /health                 | GET    | Health check                 |
| /api/ipfs/metadata      | POST   | Upload metadata to IPFS      |
| /api/ipfs/image         | POST   | Upload image to IPFS         |
| /api/ipfs/:cid          | GET    | Fetch from IPFS              |
| /api/verify-signature   | POST   | Verify wallet signature      |
| /api/auth/nonce         | GET    | Get authentication nonce     |
| /api/qr/generate        | POST   | Generate verification QR     |
| /api/qr/wallet/:address | GET    | Generate wallet QR           |

---

## 🔒 Security Considerations
- **Soulbound Enforcement:** Transfers are blocked at the contract level
- **Authorization:** Only owner can authorize institutions
- **Revocation:** Only issuer or owner can revoke credentials
- **No Backend Storage:** All credential data is on-chain or IPFS
- **Stateless Backend:** Backend cannot forge credentials

---

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

---

## 🎭 Demo Mode vs Real Mode

### Demo Mode
- **Purpose:** Allows hackathon judges and testers to experience all features without needing a real wallet or blockchain interaction.
- **How it works:**
  - All blockchain and wallet actions are simulated.
  - Inco FHE encryption is simulated for privacy demonstration.
  - Demo credentials are stored in localStorage for persistence.
  - UI banners and instructions clearly indicate demo mode.
- **When to use:** For demos, hackathon judging, or when you want to explore the app without setup.

### Real Mode
- **Purpose:** Enables actual blockchain-based credential issuance and verification.
- **How it works:**
  - Requires MetaMask or a compatible wallet.
  - Only authorized institution wallets can issue credentials.
  - Credentials are minted as real soulbound NFTs on-chain.
  - Inco FHE is used for real privacy-preserving encryption (if supported by the network).
- **How to test:**
  - Disable demo mode.
  - Create an Institution account and request authorization from the developer/owner wallet.
  - Issue and verify real credentials on the blockchain.

---

## ❓ Why Inco FHE?
- **Privacy-Preserving Encryption:** Inco FHE (Fully Homomorphic Encryption) allows computation on encrypted data, so sensitive credential information remains private even during processing or verification.
- **Zero-Knowledge Proofs:** Enables verification of credentials without revealing the underlying data, ideal for privacy-centric applications.
- **Hackathon Use Case:** Judges can see privacy features in action, even in demo mode, demonstrating advanced cryptography.
- **Future-Proof:** FHE is a cutting-edge technology for privacy in Web3 and credentialing.

## ❓ Why Shardeum?
- **Scalability:** Shardeum is a highly scalable, EVM-compatible blockchain, perfect for applications with many transactions (like credential issuance and verification).
- **Low Cost:** Minimal transaction fees make it suitable for hackathons, education, and large-scale deployments.
- **Decentralization:** Ensures trust, transparency, and censorship-resistance in credential management.
- **Testnet Support:** Easy to deploy and test smart contracts for hackathon and development scenarios.
- **EVM Compatibility:** Works seamlessly with Solidity and existing Ethereum tooling.

## ❓ Why Pinata/IPFS?
- **Decentralized Storage:** IPFS (InterPlanetary File System) stores credential metadata and images in a decentralized, tamper-proof way.
- **Pinata Integration:** Pinata provides reliable IPFS pinning and easy API access for uploading and retrieving files.
- **No Central Authority:** Ensures that credential data is not controlled by any single party and is always accessible.
- **Scalable and Cost-Effective:** No need for centralized servers or databases for credential metadata.

---

## 🎭 Demo Flow
1. **Deploy Contract** → Contract owner is set
2. **Authorize Institution** → Owner authorizes an institution wallet
3. **Issue Credential** → Institution mints soulbound NFT to student
4. **Verify Credential** → Anyone verifies via frontend or contract call
5. **Revoke (if needed)** → Issuer/owner revokes compromised credential

---

## 🔮 Future Enhancements (Out of Scope for MVP)
- Zero-Knowledge selective disclosure
- Multi-signature institution approval
- DAO governance for authorization
- Cross-chain verification bridges
- Batch issuance optimization

---

## 📜 License
MIT
