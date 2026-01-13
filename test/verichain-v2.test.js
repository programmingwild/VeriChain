/**
 * VeriChain Credential V2 - Comprehensive Test Suite
 * Tests for enhanced features: batch operations, expiration, roles, pausability
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeriChainCredentialV2", function () {
  let contract;
  let owner, admin, institution1, institution2, student1, student2, verifier;
  
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  
  const SAMPLE_URI = "ipfs://QmSampleCredentialMetadata123";
  const CREDENTIAL_TYPE = ethers.keccak256(ethers.toUtf8Bytes("DEGREE"));

  beforeEach(async function () {
    [owner, admin, institution1, institution2, student1, student2, verifier] = await ethers.getSigners();
    
    const VeriChain = await ethers.getContractFactory("VeriChainCredentialV2");
    contract = await VeriChain.deploy();
    await contract.waitForDeployment();
  });

  // ============ Deployment Tests ============
  
  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await contract.name()).to.equal("VeriChain Credential");
      expect(await contract.symbol()).to.equal("VERI");
    });

    it("should grant all roles to deployer", async function () {
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await contract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await contract.hasRole(ISSUER_ROLE, owner.address)).to.be.true;
    });

    it("should return correct version", async function () {
      expect(await contract.version()).to.equal("2.0.0");
    });

    it("should start with zero supply", async function () {
      expect(await contract.totalSupply()).to.equal(0);
    });
  });

  // ============ Institution Management Tests ============
  
  describe("Institution Management", function () {
    it("should register institution with metadata", async function () {
      const metadataUri = "ipfs://QmInstitutionMetadata";
      
      const tx = await contract.registerInstitution(institution1.address, metadataUri);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(contract, "InstitutionRegistered")
        .withArgs(institution1.address, metadataUri, block.timestamp);
      
      expect(await contract.hasRole(ISSUER_ROLE, institution1.address)).to.be.true;
      expect(await contract.institutionMetadata(institution1.address)).to.equal(metadataUri);
    });

    it("should reject zero address for institution", async function () {
      await expect(contract.registerInstitution(ethers.ZeroAddress, "uri"))
        .to.be.revertedWithCustomError(contract, "ZeroAddress");
    });

    it("should only allow admin to register institutions", async function () {
      await expect(
        contract.connect(student1).registerInstitution(institution1.address, "uri")
      ).to.be.reverted;
    });

    it("should update institution metadata", async function () {
      await contract.registerInstitution(institution1.address, "uri1");
      
      await expect(contract.updateInstitutionMetadata(institution1.address, "uri2"))
        .to.emit(contract, "InstitutionUpdated");
      
      expect(await contract.institutionMetadata(institution1.address)).to.equal("uri2");
    });

    it("should revoke institution", async function () {
      await contract.registerInstitution(institution1.address, "uri");
      
      await expect(contract.revokeInstitution(institution1.address))
        .to.emit(contract, "InstitutionRevoked");
      
      expect(await contract.hasRole(ISSUER_ROLE, institution1.address)).to.be.false;
    });
  });

  // ============ Single Credential Issuance Tests ============
  
  describe("Single Credential Issuance", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
    });

    it("should issue credential with expiration", async function () {
      const expiresAt = (await time.latest()) + 365 * 24 * 60 * 60; // 1 year
      
      await expect(
        contract.connect(institution1)["issueCredential(address,string,uint256,bytes32)"](
          student1.address,
          SAMPLE_URI,
          expiresAt,
          CREDENTIAL_TYPE
        )
      ).to.emit(contract, "CredentialIssued");
      
      expect(await contract.balanceOf(student1.address)).to.equal(1);
      expect(await contract.expirationTimestamp(0)).to.equal(expiresAt);
    });

    it("should issue credential without expiration (backwards compatible)", async function () {
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](student1.address, SAMPLE_URI)
      ).to.emit(contract, "CredentialIssued");
      
      expect(await contract.expirationTimestamp(0)).to.equal(0);
    });

    it("should reject expiration in the past", async function () {
      const pastTime = (await time.latest()) - 1000;
      
      await expect(
        contract.connect(institution1)["issueCredential(address,string,uint256,bytes32)"](
          student1.address,
          SAMPLE_URI,
          pastTime,
          CREDENTIAL_TYPE
        )
      ).to.be.revertedWithCustomError(contract, "ExpirationInPast");
    });

    it("should reject zero address recipient", async function () {
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](ethers.ZeroAddress, SAMPLE_URI)
      ).to.be.revertedWithCustomError(contract, "InvalidRecipient");
    });

    it("should reject empty URI", async function () {
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](student1.address, "")
      ).to.be.revertedWithCustomError(contract, "InvalidURI");
    });

    it("should reject URI that is too long", async function () {
      const longUri = "x".repeat(501);
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](student1.address, longUri)
      ).to.be.revertedWithCustomError(contract, "URITooLong");
    });

    it("should reject unauthorized issuer", async function () {
      await expect(
        contract.connect(student1)["issueCredential(address,string)"](student2.address, SAMPLE_URI)
      ).to.be.reverted;
    });

    it("should track credential type count", async function () {
      await contract.connect(institution1)["issueCredential(address,string,uint256,bytes32)"](
        student1.address,
        SAMPLE_URI,
        0,
        CREDENTIAL_TYPE
      );
      
      expect(await contract.credentialTypeCount(CREDENTIAL_TYPE)).to.equal(1);
    });
  });

  // ============ Batch Operations Tests ============
  
  describe("Batch Operations", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
    });

    it("should batch issue credentials", async function () {
      const params = [
        { recipient: student1.address, uri: "ipfs://1", expiresAt: 0, credentialType: CREDENTIAL_TYPE },
        { recipient: student2.address, uri: "ipfs://2", expiresAt: 0, credentialType: CREDENTIAL_TYPE },
      ];
      
      const tx = await contract.connect(institution1).batchIssueCredentials(params);
      
      await expect(tx).to.emit(contract, "BatchCredentialsIssued");
      expect(await contract.totalSupply()).to.equal(2);
      expect(await contract.balanceOf(student1.address)).to.equal(1);
      expect(await contract.balanceOf(student2.address)).to.equal(1);
    });

    it("should reject batch size exceeding maximum", async function () {
      const params = Array(51).fill({
        recipient: student1.address,
        uri: SAMPLE_URI,
        expiresAt: 0,
        credentialType: CREDENTIAL_TYPE,
      });
      
      await expect(
        contract.connect(institution1).batchIssueCredentials(params)
      ).to.be.revertedWithCustomError(contract, "BatchSizeExceeded");
    });

    it("should reject empty batch", async function () {
      await expect(
        contract.connect(institution1).batchIssueCredentials([])
      ).to.be.revertedWithCustomError(contract, "BatchSizeExceeded");
    });

    it("should validate each credential in batch", async function () {
      const params = [
        { recipient: student1.address, uri: SAMPLE_URI, expiresAt: 0, credentialType: CREDENTIAL_TYPE },
        { recipient: ethers.ZeroAddress, uri: SAMPLE_URI, expiresAt: 0, credentialType: CREDENTIAL_TYPE },
      ];
      
      await expect(
        contract.connect(institution1).batchIssueCredentials(params)
      ).to.be.revertedWithCustomError(contract, "InvalidRecipient");
    });

    it("should batch revoke credentials", async function () {
      // Issue some credentials first
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, "uri1");
      await contract.connect(institution1)["issueCredential(address,string)"](student2.address, "uri2");
      
      await contract.batchRevokeCredentials([0, 1], "Mass revocation");
      
      expect(await contract.revokedCredentials(0)).to.be.true;
      expect(await contract.revokedCredentials(1)).to.be.true;
    });
  });

  // ============ Revocation Tests ============
  
  describe("Credential Revocation", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, SAMPLE_URI);
    });

    it("should revoke credential with reason", async function () {
      await expect(contract.connect(institution1).revokeCredential(0, "Fraudulent"))
        .to.emit(contract, "CredentialRevoked")
        .withArgs(0, institution1.address, "Fraudulent", await time.latest() + 1);
      
      expect(await contract.revokedCredentials(0)).to.be.true;
      expect(await contract.revocationReason(0)).to.equal("Fraudulent");
    });

    it("should allow admin to revoke", async function () {
      await expect(contract.revokeCredential(0, "Admin revocation"))
        .to.emit(contract, "CredentialRevoked");
    });

    it("should reject revocation by non-issuer/non-admin", async function () {
      await expect(
        contract.connect(student2).revokeCredential(0, "reason")
      ).to.be.revertedWithCustomError(contract, "OnlyIssuerOrAdminCanRevoke");
    });

    it("should reject double revocation", async function () {
      await contract.connect(institution1).revokeCredential(0, "reason");
      
      await expect(
        contract.connect(institution1).revokeCredential(0, "reason")
      ).to.be.revertedWithCustomError(contract, "CredentialAlreadyRevoked");
    });

    it("should reject revocation of non-existent credential", async function () {
      await expect(
        contract.connect(institution1).revokeCredential(999, "reason")
      ).to.be.revertedWithCustomError(contract, "CredentialNotFound");
    });
  });

  // ============ Credential Renewal Tests ============
  
  describe("Credential Renewal", function () {
    let expiresAt;
    
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
      expiresAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await contract.connect(institution1)["issueCredential(address,string,uint256,bytes32)"](
        student1.address,
        SAMPLE_URI,
        expiresAt,
        CREDENTIAL_TYPE
      );
    });

    it("should renew credential expiration", async function () {
      const newExpiresAt = (await time.latest()) + 2 * 365 * 24 * 60 * 60;
      
      await expect(contract.connect(institution1).renewCredential(0, newExpiresAt))
        .to.emit(contract, "CredentialRenewed")
        .withArgs(0, expiresAt, newExpiresAt, await time.latest() + 1);
      
      expect(await contract.expirationTimestamp(0)).to.equal(newExpiresAt);
    });

    it("should reject renewal with past expiration", async function () {
      const pastTime = (await time.latest()) - 1000;
      
      await expect(
        contract.connect(institution1).renewCredential(0, pastTime)
      ).to.be.revertedWithCustomError(contract, "ExpirationInPast");
    });

    it("should reject renewal of revoked credential", async function () {
      await contract.connect(institution1).revokeCredential(0, "reason");
      
      await expect(
        contract.connect(institution1).renewCredential(0, expiresAt + 1000)
      ).to.be.revertedWithCustomError(contract, "CredentialAlreadyRevoked");
    });
  });

  // ============ Verification Tests ============
  
  describe("Credential Verification", function () {
    let expiresAt;
    
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
      expiresAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await contract.connect(institution1)["issueCredential(address,string,uint256,bytes32)"](
        student1.address,
        SAMPLE_URI,
        expiresAt,
        CREDENTIAL_TYPE
      );
    });

    it("should return complete credential info", async function () {
      const info = await contract.getCredentialInfo(0);
      
      expect(info.tokenId).to.equal(0);
      expect(info.holder).to.equal(student1.address);
      expect(info.issuer).to.equal(institution1.address);
      expect(info.expiresAt).to.equal(expiresAt);
      expect(info.isRevoked).to.be.false;
      expect(info.isExpired).to.be.false;
      expect(info.isValid).to.be.true;
    });

    it("should detect expired credentials", async function () {
      // Fast forward past expiration
      await time.increase(366 * 24 * 60 * 60);
      
      const info = await contract.getCredentialInfo(0);
      
      expect(info.isExpired).to.be.true;
      expect(info.isValid).to.be.false;
    });

    it("should detect revoked credentials", async function () {
      await contract.connect(institution1).revokeCredential(0, "reason");
      
      const info = await contract.getCredentialInfo(0);
      
      expect(info.isRevoked).to.be.true;
      expect(info.isValid).to.be.false;
      expect(info.revocationReason).to.equal("reason");
    });

    it("should detect credentials from revoked institutions", async function () {
      await contract.revokeInstitution(institution1.address);
      
      const info = await contract.getCredentialInfo(0);
      
      expect(info.isValid).to.be.false;
    });

    it("should support legacy verifyCredential", async function () {
      const [isValid, issuer, holder, issuedAt] = await contract.verifyCredential(0);
      
      expect(isValid).to.be.true;
      expect(issuer).to.equal(institution1.address);
      expect(holder).to.equal(student1.address);
      expect(issuedAt).to.be.gt(0);
    });

    it("should return valid status for simple check", async function () {
      expect(await contract.isCredentialValid(0)).to.be.true;
      
      await contract.connect(institution1).revokeCredential(0, "reason");
      
      expect(await contract.isCredentialValid(0)).to.be.false;
    });
  });

  // ============ Query Functions Tests ============
  
  describe("Query Functions", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
      await contract.registerInstitution(institution2.address, "uri");
      
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, "uri1");
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, "uri2");
      await contract.connect(institution2)["issueCredential(address,string)"](student2.address, "uri3");
    });

    it("should get credentials by holder", async function () {
      const credentials = await contract.getCredentialsByHolder(student1.address);
      
      expect(credentials.length).to.equal(2);
      expect(credentials[0]).to.equal(0n);
      expect(credentials[1]).to.equal(1n);
    });

    it("should get credentials by issuer", async function () {
      const credentials = await contract.getCredentialsByIssuer(institution1.address);
      
      expect(credentials.length).to.equal(2);
    });
  });

  // ============ Pausability Tests ============
  
  describe("Pausability", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
    });

    it("should pause contract", async function () {
      await expect(contract.pause())
        .to.emit(contract, "ContractPaused");
      
      expect(await contract.paused()).to.be.true;
    });

    it("should unpause contract", async function () {
      await contract.pause();
      
      await expect(contract.unpause())
        .to.emit(contract, "ContractUnpaused");
      
      expect(await contract.paused()).to.be.false;
    });

    it("should block issuance when paused", async function () {
      await contract.pause();
      
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](student1.address, SAMPLE_URI)
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("should block revocation when paused", async function () {
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, SAMPLE_URI);
      await contract.pause();
      
      await expect(
        contract.connect(institution1).revokeCredential(0, "reason")
      ).to.be.revertedWithCustomError(contract, "EnforcedPause");
    });

    it("should only allow admin to pause", async function () {
      await expect(
        contract.connect(student1).pause()
      ).to.be.reverted;
    });
  });

  // ============ Soulbound Tests ============
  
  describe("Soulbound (Transfer Blocking)", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
      await contract.connect(institution1)["issueCredential(address,string)"](student1.address, SAMPLE_URI);
    });

    it("should block transfers", async function () {
      await expect(
        contract.connect(student1).transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(contract, "SoulboundTokenNonTransferable");
    });

    it("should block safe transfers", async function () {
      await expect(
        contract.connect(student1)["safeTransferFrom(address,address,uint256)"](
          student1.address,
          student2.address,
          0
        )
      ).to.be.revertedWithCustomError(contract, "SoulboundTokenNonTransferable");
    });

    it("should block approvals", async function () {
      await expect(
        contract.connect(student1).approve(student2.address, 0)
      ).to.be.revertedWithCustomError(contract, "SoulboundTokenNonTransferable");
    });

    it("should block setApprovalForAll", async function () {
      await expect(
        contract.connect(student1).setApprovalForAll(student2.address, true)
      ).to.be.revertedWithCustomError(contract, "SoulboundTokenNonTransferable");
    });
  });

  // ============ Access Control Tests ============
  
  describe("Access Control", function () {
    it("should grant ADMIN_ROLE", async function () {
      await contract.grantRole(ADMIN_ROLE, admin.address);
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should allow admin to register institutions", async function () {
      await contract.grantRole(ADMIN_ROLE, admin.address);
      
      await expect(
        contract.connect(admin).registerInstitution(institution1.address, "uri")
      ).to.emit(contract, "InstitutionRegistered");
    });

    it("should revoke roles", async function () {
      await contract.grantRole(ADMIN_ROLE, admin.address);
      await contract.revokeRole(ADMIN_ROLE, admin.address);
      
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });
  });

  // ============ Gas Optimization Tests ============
  
  describe("Gas Optimization", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
    });

    it("should use reasonable gas for single issuance", async function () {
      const tx = await contract.connect(institution1)["issueCredential(address,string)"](
        student1.address,
        SAMPLE_URI
      );
      const receipt = await tx.wait();
      
      // Should be under 250k gas (includes role checks, events, etc.)
      expect(receipt.gasUsed).to.be.lt(250000);
      console.log(`    Single issuance gas: ${receipt.gasUsed}`);
    });

    it("should use reasonable gas for batch issuance", async function () {
      const params = Array(10).fill(null).map((_, i) => ({
        recipient: ethers.Wallet.createRandom().address,
        uri: `ipfs://Qm${i}`,
        expiresAt: 0,
        credentialType: CREDENTIAL_TYPE,
      }));
      
      const tx = await contract.connect(institution1).batchIssueCredentials(params);
      const receipt = await tx.wait();
      
      const perCredential = receipt.gasUsed / 10n;
      console.log(`    Batch issuance gas: ${receipt.gasUsed} (${perCredential} per credential)`);
      
      // Batch should be more efficient per credential
      expect(perCredential).to.be.lt(150000);
    });
  });

  // ============ Edge Cases ============
  
  describe("Edge Cases", function () {
    beforeEach(async function () {
      await contract.registerInstitution(institution1.address, "uri");
    });

    it("should handle maximum URI length", async function () {
      const maxUri = "x".repeat(500);
      
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](student1.address, maxUri)
      ).to.emit(contract, "CredentialIssued");
    });

    it("should handle credential issued to contract address", async function () {
      // Should revert when trying to issue to the contract itself
      await expect(
        contract.connect(institution1)["issueCredential(address,string)"](
          await contract.getAddress(),
          SAMPLE_URI
        )
      ).to.be.revertedWithCustomError(contract, "InvalidRecipient");
    });

    it("should return empty array for holder with no credentials", async function () {
      const credentials = await contract.getCredentialsByHolder(student1.address);
      expect(credentials.length).to.equal(0);
    });

    it("should return false for non-existent credential validity", async function () {
      expect(await contract.isCredentialValid(999)).to.be.false;
    });

    it("should handle getting info for non-existent credential", async function () {
      const info = await contract.getCredentialInfo(999);
      expect(info.holder).to.equal(ethers.ZeroAddress);
      expect(info.isValid).to.be.false;
    });
  });
});
