/**
 * VeriChain Backend Server
 * Stateless helper for IPFS uploads, signature verification, and QR code generation
 * 
 * NOTE: This backend does NOT store credentials - blockchain is the source of truth
 */

require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const QRCode = require("qrcode");
const { ethers } = require("ethers");

const {
  createCredentialMetadata,
  uploadMetadataToIPFS,
  uploadImageToIPFS,
  fetchFromIPFS,
  validatePinataConfig,
} = require("./ipfs");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ============ Health Check ============

app.get("/health", async (req, res) => {
  const pinataOk = await validatePinataConfig();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      ipfs: pinataOk ? "connected" : "disconnected",
    },
  });
});

// ============ IPFS Endpoints ============

// In-memory storage for local development (when IPFS is not configured)
const localMetadataStore = new Map();

/**
 * Upload credential metadata to IPFS
 * POST /api/ipfs/metadata
 */
app.post("/api/ipfs/metadata", async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      credentialType,
      issuingInstitution,
      institutionWallet,
      recipientWallet,
      recipientName,
      issueDate,
      expirationDate,
      additionalData,
    } = req.body;

    // Validate required fields
    if (!name || !credentialType || !issuingInstitution || !recipientWallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, credentialType, issuingInstitution, recipientWallet",
      });
    }

    // Create properly formatted metadata
    const metadata = createCredentialMetadata({
      name,
      description: description || `${credentialType} issued by ${issuingInstitution}`,
      image: image || "",
      credentialType,
      issuingInstitution,
      institutionWallet: institutionWallet || "",
      recipientWallet,
      recipientName,
      issueDate,
      expirationDate,
      additionalData,
    });

    // Try IPFS upload first, fallback to local storage for development
    let result;
    try {
      result = await uploadMetadataToIPFS(metadata);
    } catch (ipfsError) {
      console.log("IPFS not configured, using local storage for development");
      result = { success: false };
    }

    if (result.success) {
      res.json({
        success: true,
        ipfsUri: result.ipfsUri,
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        metadata,
      });
    } else {
      // Fallback to local storage for development
      const localHash = `QmLocal${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
      localMetadataStore.set(localHash, metadata);
      
      console.log(`Stored locally: ${localHash}`);
      
      res.json({
        success: true,
        ipfsUri: `ipfs://${localHash}`,
        ipfsHash: localHash,
        gatewayUrl: `http://localhost:3001/api/ipfs/${localHash}`,
        metadata,
        _note: "Stored locally (IPFS not configured)",
      });
    }
  } catch (error) {
    console.error("Metadata upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Upload credential image to IPFS
 * POST /api/ipfs/image
 */
app.post("/api/ipfs/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const result = await uploadImageToIPFS(req.file.buffer, req.file.originalname);

    if (result.success) {
      res.json({
        success: true,
        ipfsUri: result.ipfsUri,
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Fetch metadata from IPFS
 * GET /api/ipfs/:cid
 */
app.get("/api/ipfs/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;
    
    // Check local storage first (for development)
    if (localMetadataStore.has(cid)) {
      return res.json({
        success: true,
        data: localMetadataStore.get(cid),
      });
    }
    
    // Try IPFS
    const result = await fetchFromIPFS(cid);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============ Signature Verification ============

/**
 * Verify a wallet signature
 * POST /api/verify-signature
 */
app.post("/api/verify-signature", async (req, res) => {
  try {
    const { message, signature, expectedAddress } = req.body;

    if (!message || !signature || !expectedAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: message, signature, expectedAddress",
      });
    }

    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

    res.json({
      success: true,
      isValid,
      recoveredAddress,
      expectedAddress,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Invalid signature",
    });
  }
});

/**
 * Generate a nonce for wallet authentication
 * GET /api/auth/nonce
 */
app.get("/api/auth/nonce", (req, res) => {
  const nonce = `VeriChain Authentication\nNonce: ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({
    success: true,
    nonce,
    timestamp: Date.now(),
  });
});

// ============ QR Code Generation ============

/**
 * Generate QR code for credential verification
 * POST /api/qr/generate
 */
app.post("/api/qr/generate", async (req, res) => {
  try {
    const { tokenId, contractAddress, chainId } = req.body;

    if (tokenId === undefined || !contractAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tokenId, contractAddress",
      });
    }

    // Create verification URL that triggers PDF download
    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify/${tokenId}?autoDownload=true`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#2D2E3A",
        light: "#F4EBD3",
      },
    });

    res.json({
      success: true,
      qrCode: qrDataUrl,
      verificationUrl,
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate QR code for wallet verification
 * GET /api/qr/wallet/:address
 */
app.get("/api/qr/wallet/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { contractAddress, chainId } = req.query;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify?wallet=${address}${contractAddress ? `&contract=${contractAddress}` : ""}${chainId ? `&chain=${chainId}` : ""}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
    });

    res.json({
      success: true,
      qrCode: qrDataUrl,
      verificationUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============ Error Handling ============

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ============ Start Server ============

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("VeriChain Backend Server");
  console.log("=".repeat(50));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("");
  console.log("Endpoints:");
  console.log("  GET  /health              - Health check");
  console.log("  POST /api/ipfs/metadata   - Upload metadata to IPFS");
  console.log("  POST /api/ipfs/image      - Upload image to IPFS");
  console.log("  GET  /api/ipfs/:cid       - Fetch from IPFS");
  console.log("  POST /api/verify-signature - Verify wallet signature");
  console.log("  GET  /api/auth/nonce      - Get auth nonce");
  console.log("  POST /api/qr/generate     - Generate verification QR");
  console.log("  GET  /api/qr/wallet/:addr - Generate wallet QR");
  console.log("=".repeat(50));
});

module.exports = app;
