# VeriChain V2 Upgrade Guide

## Overview

VeriChainCredentialV2 is an enhanced version of the original contract with additional features for production use. This guide covers the new features and migration path.

## New Features in V2

### 1. Role-Based Access Control

V2 uses OpenZeppelin's AccessControl instead of simple owner-based permissions:

```solidity
// Roles
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
```

**Benefits:**
- Multiple admins can manage the contract
- Separate issuer permissions from admin permissions
- Granular role management with grant/revoke

**Usage:**
```javascript
// Grant admin role
await contract.grantRole(ADMIN_ROLE, newAdmin);

// Grant issuer role
await contract.grantRole(ISSUER_ROLE, institution);

// Or use the helper function
await contract.registerInstitution(institution, "ipfs://metadata");
```

### 2. Credential Expiration

Credentials can now have optional expiration dates:

```javascript
const oneYear = 365 * 24 * 60 * 60;
const expiresAt = Math.floor(Date.now() / 1000) + oneYear;

await contract["issueCredential(address,string,uint256,bytes32)"](
  recipient,
  "ipfs://metadata",
  expiresAt,       // Expiration timestamp (0 = never expires)
  credentialType   // bytes32 category identifier
);
```

**Renewing Credentials:**
```javascript
const newExpiration = Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60);
await contract.renewCredential(tokenId, newExpiration);
```

### 3. Batch Operations

Issue up to 50 credentials in a single transaction:

```javascript
const credentials = [
  { recipient: addr1, uri: "ipfs://1", expiresAt: 0, credentialType: type },
  { recipient: addr2, uri: "ipfs://2", expiresAt: 0, credentialType: type },
  { recipient: addr3, uri: "ipfs://3", expiresAt: 0, credentialType: type },
];

const tokenIds = await contract.batchIssueCredentials(credentials);
```

**Batch Revocation:**
```javascript
await contract.batchRevokeCredentials([0, 1, 2], "Mass revocation reason");
```

### 4. Revocation Reasons

Revocations now include a reason for auditing:

```javascript
await contract.revokeCredential(tokenId, "Fraudulent documentation");

// Retrieve reason later
const reason = await contract.revocationReason(tokenId);
```

### 5. Pausability

Contract can be paused in emergencies:

```javascript
// Pause all operations
await contract.pause();

// Operations will revert with EnforcedPause error
// await contract.issueCredential(...); // REVERTS

// Resume operations
await contract.unpause();
```

### 6. Enhanced Verification

New comprehensive verification function:

```javascript
const info = await contract.getCredentialInfo(tokenId);

console.log({
  tokenId: info.tokenId,
  holder: info.holder,
  issuer: info.issuer,
  uri: info.uri,
  issuedAt: info.issuedAt,
  expiresAt: info.expiresAt,
  isRevoked: info.isRevoked,
  isExpired: info.isExpired,
  isValid: info.isValid,
  revocationReason: info.revocationReason
});
```

**Simple Validity Check:**
```javascript
const isValid = await contract.isCredentialValid(tokenId);
```

### 7. Institution Metadata

Institutions can have associated metadata:

```javascript
await contract.registerInstitution(
  institutionAddress,
  "ipfs://QmInstitutionMetadata" // Name, logo, description, etc.
);

// Update later
await contract.updateInstitutionMetadata(
  institutionAddress,
  "ipfs://QmNewMetadata"
);

// Retrieve
const metadata = await contract.institutionMetadata(institutionAddress);
```

### 8. Query Functions

New query capabilities:

```javascript
// Get all credentials issued by an institution
const credentials = await contract.getCredentialsByIssuer(institutionAddress);

// Get credential type statistics
const count = await contract.credentialTypeCount(credentialType);
```

## Migration from V1

### Option 1: Fresh Deployment (Recommended for New Projects)

1. Deploy V2 contract:
```bash
npx hardhat run scripts/deploy-v2.js --network polygonAmoy
```

2. Register institutions with the new role system:
```javascript
await contract.registerInstitution(institution, "ipfs://metadata");
```

3. Issue new credentials using V2 features

### Option 2: Parallel Operation (For Existing Projects)

Run both contracts simultaneously:

1. Deploy V2 alongside V1
2. Update frontend to support both contracts
3. Issue new credentials on V2
4. V1 credentials remain verifiable

### Frontend Updates

Update your contract utilities:

```javascript
// Check contract version
const version = await contract.version();

if (version === "2.0.0") {
  // Use V2 features
  const info = await contract.getCredentialInfo(tokenId);
  return {
    isValid: info.isValid,
    isExpired: info.isExpired,
    expiresAt: info.expiresAt
  };
} else {
  // V1 compatibility
  const [isValid, issuer, holder, issuedAt] = await contract.verifyCredential(tokenId);
  return { isValid, issuer, holder, issuedAt };
}
```

## Comparison Table

| Feature | V1 | V2 |
|---------|----|----|
| Soulbound (Non-Transferable) | ✅ | ✅ |
| Institution Authorization | ✅ | ✅ |
| Credential Revocation | ✅ | ✅ |
| Role-Based Access Control | ❌ | ✅ |
| Credential Expiration | ❌ | ✅ |
| Batch Operations | ❌ | ✅ |
| Pausability | ❌ | ✅ |
| Revocation Reasons | ❌ | ✅ |
| Credential Renewal | ❌ | ✅ |
| Institution Metadata | ❌ | ✅ |
| Reentrancy Protection | ❌ | ✅ |
| Input Validation | Basic | Comprehensive |
| Gas Optimization | Standard | Optimized |

## Gas Costs Comparison

| Operation | V1 Gas | V2 Gas | Difference |
|-----------|--------|--------|------------|
| Deploy | ~2.3M | ~2.8M | +22% (more features) |
| Issue Single | ~145K | ~155K | +7% |
| Issue Batch (10) | N/A | ~1.0M | New feature |
| Revoke | ~45K | ~55K | +22% (stores reason) |
| Verify | ~25K | ~28K | +12% (more checks) |

## Security Improvements

1. **ReentrancyGuard**: All state-changing functions protected
2. **Input Validation**: Comprehensive checks for all inputs
3. **Access Control**: Granular role-based permissions
4. **Pausability**: Emergency stop mechanism
5. **Constants**: Immutable limits (MAX_BATCH_SIZE, MAX_URI_LENGTH)

## Breaking Changes

1. **Authorization**: `authorizeInstitution()` replaced with `registerInstitution()`
2. **Revocation**: `revokeCredential(tokenId)` now requires reason parameter
3. **Roles**: Must use `hasRole(ISSUER_ROLE, address)` instead of `authorizedInstitutions[address]`

## Backwards Compatibility

The following V1 functions are preserved:

```solidity
// Still works in V2
function issueCredential(address recipient, string uri) returns (uint256)
function verifyCredential(uint256 tokenId) returns (bool, address, address, uint256)
function getCredentialsByHolder(address holder) returns (uint256[])
```

## Deployment Script

Create `scripts/deploy-v2.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying V2 with:", deployer.address);

  const VeriChain = await hre.ethers.getContractFactory("VeriChainCredentialV2");
  const contract = await VeriChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("VeriChainCredentialV2 deployed to:", address);
  console.log("Version:", await contract.version());

  // Register initial institutions
  // await contract.registerInstitution(INSTITUTION_ADDRESS, "ipfs://metadata");
}

main().catch(console.error);
```

## Testing V2

```bash
# Run V2 tests
npx hardhat test test/verichain-v2.test.js

# Check gas usage
REPORT_GAS=true npx hardhat test test/verichain-v2.test.js
```

## Questions?

- Review the [API Documentation](./API.md)
- Check the [README](../README.md)
- Open an issue on GitHub
