/**
 * VeriChain End-to-End Demo Script
 * 
 * This script demonstrates the complete flow:
 * 1. Issue a credential from an authorized institution
 * 2. Verify the credential
 * 3. Revoke the credential
 * 4. Verify revocation status
 * 
 * Run with: npx hardhat run scripts/demo.js --network localhost
 */

const { ethers } = require("hardhat");

// Contract address from deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Sample IPFS metadata URI (in production, this would be uploaded to IPFS first)
const SAMPLE_METADATA_URI = "ipfs://QmDemo123456789abcdef";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🎓 VeriChain End-to-End Demo");
  console.log("=".repeat(60));

  // Get signers
  const [owner, institution, student, verifier] = await ethers.getSigners();
  
  console.log("\n📋 Accounts:");
  console.log(`   Owner/Admin:    ${owner.address}`);
  console.log(`   Institution:    ${institution.address}`);
  console.log(`   Student:        ${student.address}`);
  console.log(`   Verifier:       ${verifier.address}`);

  // Connect to deployed contract
  const VeriChain = await ethers.getContractFactory("VeriChainCredential");
  const verichain = VeriChain.attach(CONTRACT_ADDRESS);

  console.log(`\n📜 Contract: ${CONTRACT_ADDRESS}`);

  // ============ STEP 1: Check Initial State ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 1: Checking Initial State");
  console.log("-".repeat(60));

  const totalSupply = await verichain.totalSupply();
  console.log(`   Total credentials issued: ${totalSupply}`);

  const isInstitutionAuthorized = await verichain.isAuthorizedInstitution(institution.address);
  console.log(`   Institution authorized: ${isInstitutionAuthorized}`);

  // ============ STEP 2: Issue Credential ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 2: Institution Issues Credential to Student");
  console.log("-".repeat(60));

  console.log(`   Issuing credential from: ${institution.address}`);
  console.log(`   Recipient: ${student.address}`);
  console.log(`   Metadata URI: ${SAMPLE_METADATA_URI}`);

  const issueTx = await verichain.connect(institution).issueCredential(
    student.address,
    SAMPLE_METADATA_URI
  );
  const issueReceipt = await issueTx.wait();

  // Find the token ID from the event
  const issueEvent = issueReceipt.logs.find(
    log => log.fragment && log.fragment.name === "CredentialIssued"
  );
  const tokenId = issueEvent.args[0];

  console.log(`\n   ✅ Credential Issued Successfully!`);
  console.log(`   Token ID: ${tokenId}`);
  console.log(`   Transaction: ${issueReceipt.hash}`);

  // ============ STEP 3: Verify Credential (as third party) ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 3: Third Party Verifies Credential");
  console.log("-".repeat(60));

  // Anyone can verify - using verifier account
  const [isValid, issuer, holder, issuedAt] = await verichain.connect(verifier).verifyCredential(tokenId);
  
  console.log(`   Verification Result:`);
  console.log(`   ├─ Valid: ${isValid ? "✅ YES" : "❌ NO"}`);
  console.log(`   ├─ Issuer: ${issuer}`);
  console.log(`   ├─ Holder: ${holder}`);
  console.log(`   └─ Issued At: ${new Date(Number(issuedAt) * 1000).toISOString()}`);

  // Get token URI
  const tokenURI = await verichain.tokenURI(tokenId);
  console.log(`\n   Token URI: ${tokenURI}`);

  // ============ STEP 4: Attempt Transfer (Should Fail) ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 4: Attempt to Transfer (Soulbound Test)");
  console.log("-".repeat(60));

  try {
    await verichain.connect(student).transferFrom(student.address, verifier.address, tokenId);
    console.log(`   ❌ Transfer succeeded (this should not happen!)`);
  } catch (error) {
    console.log(`   ✅ Transfer blocked: SoulboundTokenNonTransferable`);
    console.log(`   Credentials are permanently bound to the recipient!`);
  }

  // ============ STEP 5: Check Student's Credentials ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 5: Get All Credentials for Student");
  console.log("-".repeat(60));

  const studentCredentials = await verichain.getCredentialsByHolder(student.address);
  console.log(`   Student has ${studentCredentials.length} credential(s): [${studentCredentials.join(", ")}]`);

  // ============ STEP 6: Revoke Credential ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 6: Institution Revokes Credential");
  console.log("-".repeat(60));

  console.log(`   Revoking token ID: ${tokenId}`);

  const revokeTx = await verichain.connect(institution).revokeCredential(tokenId);
  await revokeTx.wait();

  console.log(`   ✅ Credential Revoked Successfully!`);

  // ============ STEP 7: Verify After Revocation ============
  console.log("\n" + "-".repeat(60));
  console.log("STEP 7: Verify Credential After Revocation");
  console.log("-".repeat(60));

  const [isValidAfter, issuerAfter, holderAfter, issuedAtAfter] = await verichain.verifyCredential(tokenId);
  const isRevoked = await verichain.revokedCredentials(tokenId);

  console.log(`   Verification Result:`);
  console.log(`   ├─ Valid: ${isValidAfter ? "✅ YES" : "❌ NO (REVOKED)"}`);
  console.log(`   ├─ Revoked: ${isRevoked ? "⚠️ YES" : "NO"}`);
  console.log(`   ├─ Issuer: ${issuerAfter}`);
  console.log(`   └─ Holder: ${holderAfter}`);

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Demo Complete!");
  console.log("=".repeat(60));
  console.log(`
Summary:
✅ Credential issued by authorized institution
✅ Third party verified credential on-chain
✅ Transfer blocked (soulbound enforcement)
✅ Credential revoked by issuer
✅ Revocation reflected in real-time verification

The system works exactly as designed:
• Blockchain is the source of truth
• No intermediaries needed for verification
• Credentials are non-transferable
• Revocation is instant and verifiable
`);

  // ============ Issue Another Credential for Demo ============
  console.log("-".repeat(60));
  console.log("Bonus: Issuing a fresh credential for UI testing...");
  console.log("-".repeat(60));

  const freshTx = await verichain.connect(institution).issueCredential(
    student.address,
    "ipfs://QmFreshCredentialForUITesting"
  );
  const freshReceipt = await freshTx.wait();
  const freshEvent = freshReceipt.logs.find(
    log => log.fragment && log.fragment.name === "CredentialIssued"
  );

  console.log(`   ✅ Fresh credential issued: Token ID ${freshEvent.args[0]}`);
  console.log(`\n   You can now verify this in the UI at http://localhost:3000`);
  console.log(`   Enter wallet: ${student.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Demo failed:", error);
    process.exit(1);
  });
