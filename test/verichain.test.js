const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriChainCredential", function () {
  let verichain;
  let owner;
  let institution;
  let student;
  let unauthorized;
  let anotherStudent;

  const SAMPLE_IPFS_URI = "ipfs://QmTest123456789abcdef";
  const SAMPLE_IPFS_URI_2 = "ipfs://QmAnotherTest987654321";

  beforeEach(async function () {
    // Get signers
    [owner, institution, student, unauthorized, anotherStudent] = await ethers.getSigners();

    // Deploy contract
    const VeriChainCredential = await ethers.getContractFactory("VeriChainCredential");
    verichain = await VeriChainCredential.deploy();
    await verichain.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await verichain.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await verichain.name()).to.equal("VeriChain Credential");
      expect(await verichain.symbol()).to.equal("VERI");
    });

    it("Should start with zero total supply", async function () {
      expect(await verichain.totalSupply()).to.equal(0);
    });
  });

  describe("Institution Authorization", function () {
    it("Should allow owner to authorize an institution", async function () {
      const tx = await verichain.authorizeInstitution(institution.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(verichain, "InstitutionAuthorized")
        .withArgs(institution.address, block.timestamp);

      expect(await verichain.authorizedInstitutions(institution.address)).to.be.true;
      expect(await verichain.isAuthorizedInstitution(institution.address)).to.be.true;
    });

    it("Should allow owner to revoke institution authorization", async function () {
      await verichain.authorizeInstitution(institution.address);
      
      const tx = await verichain.revokeInstitution(institution.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(verichain, "InstitutionRevoked")
        .withArgs(institution.address, block.timestamp);

      expect(await verichain.authorizedInstitutions(institution.address)).to.be.false;
    });

    it("Should prevent non-owner from authorizing institutions", async function () {
      await expect(
        verichain.connect(unauthorized).authorizeInstitution(institution.address)
      ).to.be.revertedWithCustomError(verichain, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from revoking institutions", async function () {
      await verichain.authorizeInstitution(institution.address);
      
      await expect(
        verichain.connect(unauthorized).revokeInstitution(institution.address)
      ).to.be.revertedWithCustomError(verichain, "OwnableUnauthorizedAccount");
    });
  });

  describe("Credential Issuance (Authorized Minting)", function () {
    beforeEach(async function () {
      await verichain.authorizeInstitution(institution.address);
    });

    it("Should allow authorized institution to issue credential", async function () {
      const tx = await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
      const receipt = await tx.wait();

      // Check event emission
      await expect(tx)
        .to.emit(verichain, "CredentialIssued")
        .withArgs(0, student.address, institution.address, SAMPLE_IPFS_URI, await getBlockTimestamp());

      // Check ownership
      expect(await verichain.ownerOf(0)).to.equal(student.address);
      expect(await verichain.balanceOf(student.address)).to.equal(1);
      
      // Check token URI
      expect(await verichain.tokenURI(0)).to.equal(SAMPLE_IPFS_URI);
      
      // Check issuer mapping
      expect(await verichain.credentialIssuer(0)).to.equal(institution.address);
      
      // Check total supply
      expect(await verichain.totalSupply()).to.equal(1);
    });

    it("Should prevent unauthorized address from issuing credentials", async function () {
      await expect(
        verichain.connect(unauthorized).issueCredential(student.address, SAMPLE_IPFS_URI)
      ).to.be.revertedWithCustomError(verichain, "NotAuthorizedInstitution");
    });

    it("Should issue multiple credentials with sequential IDs", async function () {
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
      await verichain.connect(institution).issueCredential(anotherStudent.address, SAMPLE_IPFS_URI_2);

      expect(await verichain.ownerOf(0)).to.equal(student.address);
      expect(await verichain.ownerOf(1)).to.equal(anotherStudent.address);
      expect(await verichain.totalSupply()).to.equal(2);
    });

    it("Should allow same student to receive multiple credentials", async function () {
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI_2);

      expect(await verichain.balanceOf(student.address)).to.equal(2);
    });

    it("Should prevent revoked institution from issuing", async function () {
      await verichain.revokeInstitution(institution.address);
      
      await expect(
        verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI)
      ).to.be.revertedWithCustomError(verichain, "NotAuthorizedInstitution");
    });
  });

  describe("Soulbound: Blocked Transfers", function () {
    beforeEach(async function () {
      await verichain.authorizeInstitution(institution.address);
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
    });

    it("Should block transferFrom", async function () {
      await expect(
        verichain.connect(student).transferFrom(student.address, unauthorized.address, 0)
      ).to.be.revertedWithCustomError(verichain, "SoulboundTokenNonTransferable");
    });

    it("Should block safeTransferFrom", async function () {
      await expect(
        verichain.connect(student)["safeTransferFrom(address,address,uint256)"](
          student.address, 
          unauthorized.address, 
          0
        )
      ).to.be.revertedWithCustomError(verichain, "SoulboundTokenNonTransferable");
    });

    it("Should block safeTransferFrom with data", async function () {
      await expect(
        verichain.connect(student)["safeTransferFrom(address,address,uint256,bytes)"](
          student.address, 
          unauthorized.address, 
          0,
          "0x"
        )
      ).to.be.revertedWithCustomError(verichain, "SoulboundTokenNonTransferable");
    });

    it("Should block approve", async function () {
      await expect(
        verichain.connect(student).approve(unauthorized.address, 0)
      ).to.be.revertedWithCustomError(verichain, "SoulboundTokenNonTransferable");
    });

    it("Should block setApprovalForAll", async function () {
      await expect(
        verichain.connect(student).setApprovalForAll(unauthorized.address, true)
      ).to.be.revertedWithCustomError(verichain, "SoulboundTokenNonTransferable");
    });
  });

  describe("Credential Revocation", function () {
    beforeEach(async function () {
      await verichain.authorizeInstitution(institution.address);
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
    });

    it("Should allow issuing institution to revoke credential", async function () {
      const tx = await verichain.connect(institution).revokeCredential(0);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(verichain, "CredentialRevoked")
        .withArgs(0, institution.address, block.timestamp);

      expect(await verichain.revokedCredentials(0)).to.be.true;
    });

    it("Should allow contract owner to revoke any credential", async function () {
      const tx = await verichain.connect(owner).revokeCredential(0);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(verichain, "CredentialRevoked")
        .withArgs(0, owner.address, block.timestamp);

      expect(await verichain.revokedCredentials(0)).to.be.true;
    });

    it("Should prevent credential holder from revoking their own credential", async function () {
      await expect(
        verichain.connect(student).revokeCredential(0)
      ).to.be.revertedWithCustomError(verichain, "OnlyIssuerCanRevoke");
    });

    it("Should prevent unauthorized address from revoking", async function () {
      await expect(
        verichain.connect(unauthorized).revokeCredential(0)
      ).to.be.revertedWithCustomError(verichain, "OnlyIssuerCanRevoke");
    });

    it("Should prevent double revocation", async function () {
      await verichain.connect(institution).revokeCredential(0);
      
      await expect(
        verichain.connect(institution).revokeCredential(0)
      ).to.be.revertedWithCustomError(verichain, "CredentialAlreadyRevoked");
    });

    it("Should revert when revoking non-existent credential", async function () {
      await expect(
        verichain.connect(institution).revokeCredential(999)
      ).to.be.revertedWithCustomError(verichain, "CredentialNotFound");
    });
  });

  describe("Credential Verification", function () {
    beforeEach(async function () {
      await verichain.authorizeInstitution(institution.address);
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
    });

    it("Should verify valid credential", async function () {
      const [isValid, issuer, holder, issuedAt] = await verichain.verifyCredential(0);

      expect(isValid).to.be.true;
      expect(issuer).to.equal(institution.address);
      expect(holder).to.equal(student.address);
      expect(issuedAt).to.be.gt(0);
    });

    it("Should return invalid for revoked credential", async function () {
      await verichain.connect(institution).revokeCredential(0);
      
      const [isValid, issuer, holder, issuedAt] = await verichain.verifyCredential(0);

      expect(isValid).to.be.false;
      expect(issuer).to.equal(institution.address);
      expect(holder).to.equal(student.address);
    });

    it("Should return invalid for credential from de-authorized institution", async function () {
      await verichain.revokeInstitution(institution.address);
      
      const [isValid, issuer, holder, issuedAt] = await verichain.verifyCredential(0);

      expect(isValid).to.be.false;
      expect(issuer).to.equal(institution.address);
      expect(holder).to.equal(student.address);
    });

    it("Should return zeros for non-existent credential", async function () {
      const [isValid, issuer, holder, issuedAt] = await verichain.verifyCredential(999);

      expect(isValid).to.be.false;
      expect(issuer).to.equal(ethers.ZeroAddress);
      expect(holder).to.equal(ethers.ZeroAddress);
      expect(issuedAt).to.equal(0);
    });
  });

  describe("Get Credentials by Holder", function () {
    beforeEach(async function () {
      await verichain.authorizeInstitution(institution.address);
    });

    it("Should return empty array for holder with no credentials", async function () {
      const credentials = await verichain.getCredentialsByHolder(student.address);
      expect(credentials).to.deep.equal([]);
    });

    it("Should return all credentials for a holder", async function () {
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI);
      await verichain.connect(institution).issueCredential(anotherStudent.address, SAMPLE_IPFS_URI_2);
      await verichain.connect(institution).issueCredential(student.address, SAMPLE_IPFS_URI_2);

      const studentCredentials = await verichain.getCredentialsByHolder(student.address);
      expect(studentCredentials).to.deep.equal([0n, 2n]);

      const anotherStudentCredentials = await verichain.getCredentialsByHolder(anotherStudent.address);
      expect(anotherStudentCredentials).to.deep.equal([1n]);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle issuing to zero address gracefully", async function () {
      await verichain.authorizeInstitution(institution.address);
      
      await expect(
        verichain.connect(institution).issueCredential(ethers.ZeroAddress, SAMPLE_IPFS_URI)
      ).to.be.revertedWithCustomError(verichain, "ERC721InvalidReceiver");
    });

    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID
      expect(await verichain.supportsInterface("0x80ac58cd")).to.be.true;
      // ERC721Metadata interface ID
      expect(await verichain.supportsInterface("0x5b5e139f")).to.be.true;
    });
  });

  // Helper function to get current block timestamp
  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
