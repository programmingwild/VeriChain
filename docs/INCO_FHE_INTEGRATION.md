# VeriChain - Inco FHE Integration Guide

This document explains how to use the optional Inco FHE (Fully Homomorphic Encryption) integration for encrypting sensitive credential data while maintaining public verifiability.

## 🔐 What is Inco FHE?

Inco provides Fully Homomorphic Encryption for blockchain applications, allowing data to be encrypted in a way that:
- Only authorized parties can decrypt
- Computations can be performed on encrypted data
- Privacy is preserved on-chain

## 📋 Architecture: Hybrid Credentials

VeriChain uses a **hybrid approach**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID CREDENTIAL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUBLIC DATA (Always Visible)         PRIVATE DATA (Encrypted) │
│  ┌─────────────────────────┐          ┌───────────────────────┐ │
│  │ • Issuer Address        │          │ • Student ID          │ │
│  │ • Issue Date            │          │ • Grade/Score         │ │
│  │ • Credential Type       │          │ • Date of Birth       │ │
│  │ • Achievement Name      │          │ • Personal Email      │ │
│  │ • IPFS Metadata URI     │          │                       │ │
│  └─────────────────────────┘          └───────────────────────┘ │
│           │                                     │               │
│           ▼                                     ▼               │
│   Anyone Can Verify             Only Authorized Viewers         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Local Development (Simulated Mode)

No additional setup needed! The default configuration uses simulated encryption:

```bash
# .env.local
NEXT_PUBLIC_USE_INCO_FHE=false
```

In simulation mode:
- Data is hashed using SHA-256 (not truly encrypted)
- Great for development and testing
- No external dependencies

### 2. Deploy the Hybrid Contract

```bash
# Start Hardhat node (if not running)
npx hardhat node

# Deploy the hybrid contract
npx hardhat run scripts/deploy-hybrid.js --network localhost
```

Copy the contract address to `.env.local`:
```bash
NEXT_PUBLIC_HYBRID_CONTRACT_ADDRESS=0x...
```

### 3. Issue a Hybrid Credential

Navigate to `/issue-hybrid` to:
1. Fill in public credential data
2. Toggle "Private Data" to enable encryption
3. Enter sensitive data (student ID, grade, etc.)
4. Click "Encrypt" to generate FHE handles
5. Submit the transaction

## 🔧 Production Setup (Base Sepolia)

### Prerequisites

1. **Install Inco dependencies:**
   ```bash
   cd frontend
   npm install @inco/js viem
   ```

2. **Get Base Sepolia ETH:**
   - Visit [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
   - Fund your wallet with test ETH

3. **Update environment:**
   ```bash
   # .env.local
   NEXT_PUBLIC_USE_INCO_FHE=true
   NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
   ```

### Network Configuration

| Setting | Value |
|---------|-------|
| Network | Base Sepolia |
| Chain ID | 84532 |
| RPC URL | https://sepolia.base.org |
| Inco Mode | Testnet (Lightning SDK) |

## 📁 File Structure

```
frontend/
├── utils/
│   └── inco.js              # Inco FHE integration module
├── components/
│   └── EncryptedCredentialInput.js  # Encryption UI component
└── pages/
    └── issue-hybrid.js      # Hybrid credential issuance page

contracts/
└── VeriChainCredentialHybrid.sol    # Hybrid smart contract

scripts/
└── deploy-hybrid.js         # Deployment script
```

## 🔑 Access Control

### Granting Access

Only the credential holder can grant access to private data:

```javascript
// Grant access for 30 days
await contract.grantPrivateDataAccess(
  tokenId,
  viewerAddress,
  30 * 24 * 60 * 60  // duration in seconds
);

// Grant permanent access
await contract.grantPrivateDataAccess(tokenId, viewerAddress, 0);
```

### Revoking Access

```javascript
await contract.revokePrivateDataAccess(tokenId, viewerAddress);
```

### Checking Access

```javascript
const hasAccess = await contract.hasValidAccess(tokenId, viewerAddress);
```

## 📊 API Reference

### VeriChainEncryption (frontend/utils/inco.js)

```javascript
import { VeriChainEncryption, useVeriChainEncryption } from '../utils/inco';

// Initialize
await VeriChainEncryption.init(walletClient);

// Check mode
VeriChainEncryption.isRealFHE();  // true if on Base Sepolia

// Encrypt credential data
const encrypted = await VeriChainEncryption.encryptCredentialData({
  studentId: 'STU-001',
  grade: 'A+',
  personalData: { dateOfBirth: '2000-01-01', email: 'student@email.com' }
}, { address: userAddress, contractAddress });

// React hook
const { initialized, isRealFHE, fee, encryptCredentialData } = useVeriChainEncryption();
```

### VeriChainCredentialHybrid.sol

```solidity
// Issue standard credential (public only)
function issueCredential(
    address recipient,
    string memory credentialType,
    string memory achievementName,
    string memory achievementDescription,
    string memory metadataURI
) external returns (uint256);

// Issue hybrid credential (public + encrypted private)
function issueCredentialWithPrivateData(
    address recipient,
    string memory credentialType,
    string memory achievementName,
    string memory achievementDescription,
    string memory metadataURI,
    bytes memory encryptedStudentId,
    bytes memory encryptedGrade,
    bytes memory encryptedPersonalData
) external returns (uint256);

// Get encrypted handles (requires access)
function getPrivateData(uint256 tokenId) external view returns (
    bytes memory encryptedStudentId,
    bytes memory encryptedGrade,
    bytes memory encryptedPersonalData
);
```

## ⚠️ Limitations

1. **Testnet Only**: Inco FHE is currently only available on Base Sepolia testnet
2. **Fee Required**: Real FHE encryption requires a small fee (~0.001 ETH)
3. **Decryption UX**: Decryption requires wallet signature for re-encryption
4. **Not for Large Data**: FHE is best for small values; use IPFS for large files

## 🔗 Resources

- [Inco Documentation](https://docs.inco.org/)
- [Inco GitHub](https://github.com/Inco-fhevm)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Lightning SDK](https://docs.inco.org/getting-started/connect-to-inco/lightning-integration)

## 🆘 Troubleshooting

### "Encryption failed" in simulation mode
- This shouldn't happen, but check browser console for errors
- Ensure ethers.js is properly loaded

### "Fee estimation failed" in real FHE mode
- Make sure wallet is connected to Base Sepolia
- Ensure you have ETH for gas

### "NoPrivateDataAccess" error
- The viewer doesn't have access to private data
- Credential holder must grant access first

### "NotAuthorizedInstitution" error
- The issuing wallet is not authorized
- Contract owner must call `authorizeInstitution(address)`
