/**
 * VeriChain Backend Server (Enhanced)
 * Production-ready with rate limiting, validation, logging, and security headers
 */

require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const QRCode = require("qrcode");
const { ethers } = require("ethers");
const crypto = require("crypto");

// ============ Configuration ============

const CONFIG = {
  port: process.env.PORT || 3001,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // requests per window
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:3001"],
  logLevel: process.env.LOG_LEVEL || "info",
};

// ============ Logger ============

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[CONFIG.logLevel] || 1;

const logger = {
  debug: (...args) => currentLogLevel <= 0 && console.log("[DEBUG]", new Date().toISOString(), ...args),
  info: (...args) => currentLogLevel <= 1 && console.log("[INFO]", new Date().toISOString(), ...args),
  warn: (...args) => currentLogLevel <= 2 && console.warn("[WARN]", new Date().toISOString(), ...args),
  error: (...args) => currentLogLevel <= 3 && console.error("[ERROR]", new Date().toISOString(), ...args),
};

// ============ Rate Limiter (Simple In-Memory) ============

class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const timestamps = this.requests.get(key).filter(t => t > windowStart);
    this.requests.set(key, timestamps);
    
    if (timestamps.length >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetIn: Math.ceil((timestamps[0] + this.windowMs - now) / 1000) };
    }
    
    timestamps.push(now);
    return { allowed: true, remaining: this.maxRequests - timestamps.length, resetIn: Math.ceil(this.windowMs / 1000) };
  }
  
  cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

const rateLimiter = new RateLimiter(CONFIG.rateLimitWindow, CONFIG.rateLimitMax);

// ============ Validators ============

const validators = {
  ethereumAddress: (address) => {
    if (!address) return { valid: false, error: "Address is required" };
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { valid: false, error: "Invalid Ethereum address format" };
    }
    return { valid: true };
  },
  
  ipfsUri: (uri) => {
    if (!uri) return { valid: false, error: "URI is required" };
    if (!uri.startsWith("ipfs://") && !uri.startsWith("Qm") && !uri.startsWith("bafy")) {
      return { valid: false, error: "Invalid IPFS URI format" };
    }
    return { valid: true };
  },
  
  credentialMetadata: (data) => {
    const required = ["name", "credentialType", "issuingInstitution", "recipientWallet"];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      return { valid: false, error: `Missing required fields: ${missing.join(", ")}` };
    }
    
    // Validate wallet address
    const addressCheck = validators.ethereumAddress(data.recipientWallet);
    if (!addressCheck.valid) {
      return { valid: false, error: `Invalid recipientWallet: ${addressCheck.error}` };
    }
    
    // Validate name length
    if (data.name.length > 200) {
      return { valid: false, error: "Name must be 200 characters or less" };
    }
    
    // Validate credential type
    if (data.credentialType.length > 100) {
      return { valid: false, error: "Credential type must be 100 characters or less" };
    }
    
    return { valid: true };
  },
  
  signature: (data) => {
    const { message, signature, expectedSigner } = data;
    
    if (!message || !signature || !expectedSigner) {
      return { valid: false, error: "Missing message, signature, or expectedSigner" };
    }
    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== expectedSigner.toLowerCase()) {
        return { valid: false, error: "Signature does not match expected signer" };
      }
      return { valid: true, signer: recoveredAddress };
    } catch (error) {
      return { valid: false, error: `Invalid signature: ${error.message}` };
    }
  },
};

// ============ IPFS Module ============

const {
  createCredentialMetadata,
  uploadMetadataToIPFS,
  uploadImageToIPFS,
  fetchFromIPFS,
  validatePinataConfig,
} = require("./ipfs");

// ============ Express App Setup ============

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (CONFIG.corsOrigins.includes(origin) || CONFIG.corsOrigins.includes("*")) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
}));

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms [${req.requestId}]`);
  });
  
  next();
});

// Rate limiting middleware
const rateLimitMiddleware = (req, res, next) => {
  const key = req.ip || req.connection.remoteAddress;
  const result = rateLimiter.isAllowed(key);
  
  res.setHeader("X-RateLimit-Limit", CONFIG.rateLimitMax);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.resetIn);
  
  if (!result.allowed) {
    logger.warn(`Rate limit exceeded for ${key}`);
    return res.status(429).json({
      success: false,
      error: "Too many requests",
      retryAfter: result.resetIn,
    });
  }
  
  next();
};

app.use("/api", rateLimitMiddleware);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CONFIG.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(", ")}`), false);
    }
  },
});

// ============ In-Memory Storage (Development) ============

const localMetadataStore = new Map();
const localImageStore = new Map();

// ============ Health & Status Endpoints ============

app.get("/health", async (req, res) => {
  try {
    const pinataOk = await validatePinataConfig();
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      uptime: process.uptime(),
      services: {
        ipfs: pinataOk ? "connected" : "local-fallback",
        server: "running",
      },
      stats: {
        localMetadataCount: localMetadataStore.size,
        localImageCount: localImageStore.size,
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    service: "VeriChain API",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ============ IPFS Endpoints ============

/**
 * Upload credential metadata
 * POST /api/ipfs/metadata
 */
app.post("/api/ipfs/metadata", async (req, res) => {
  try {
    // Validate request body
    const validation = validators.credentialMetadata(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        requestId: req.requestId,
      });
    }

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

    // Create metadata
    const metadata = createCredentialMetadata({
      name: name.trim(),
      description: description?.trim() || `${credentialType} issued by ${issuingInstitution}`,
      image: image || "",
      credentialType: credentialType.trim(),
      issuingInstitution: issuingInstitution.trim(),
      institutionWallet: institutionWallet || "",
      recipientWallet: recipientWallet.trim(),
      recipientName: recipientName?.trim(),
      issueDate,
      expirationDate,
      additionalData,
    });

    // Add metadata hash for integrity verification
    const metadataHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(metadata))
      .digest("hex");

    // Try IPFS upload
    let result;
    try {
      result = await uploadMetadataToIPFS(metadata);
    } catch (ipfsError) {
      logger.warn("IPFS upload failed, using local storage:", ipfsError.message);
      result = { success: false };
    }

    if (result.success) {
      logger.info(`Metadata uploaded to IPFS: ${result.ipfsHash}`);
      res.json({
        success: true,
        ipfsUri: result.ipfsUri,
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        metadataHash,
        metadata,
        requestId: req.requestId,
      });
    } else {
      // Local fallback
      const localHash = `QmLocal${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
      localMetadataStore.set(localHash, { metadata, createdAt: new Date().toISOString() });
      
      logger.info(`Metadata stored locally: ${localHash}`);
      
      res.json({
        success: true,
        ipfsUri: `ipfs://${localHash}`,
        ipfsHash: localHash,
        gatewayUrl: `http://localhost:${CONFIG.port}/api/ipfs/${localHash}`,
        metadataHash,
        metadata,
        storage: "local",
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.error("Metadata upload error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      requestId: req.requestId,
    });
  }
});

/**
 * Upload credential image
 * POST /api/ipfs/image
 */
app.post("/api/ipfs/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
        requestId: req.requestId,
      });
    }

    logger.debug(`Uploading image: ${req.file.originalname} (${req.file.size} bytes)`);

    let result;
    try {
      result = await uploadImageToIPFS(req.file.buffer, req.file.originalname);
    } catch (ipfsError) {
      logger.warn("IPFS image upload failed:", ipfsError.message);
      result = { success: false };
    }

    if (result.success) {
      logger.info(`Image uploaded to IPFS: ${result.ipfsHash}`);
      res.json({
        success: true,
        ipfsUri: result.ipfsUri,
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        requestId: req.requestId,
      });
    } else {
      // Local fallback
      const localHash = `QmImg${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
      localImageStore.set(localHash, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        createdAt: new Date().toISOString(),
      });
      
      res.json({
        success: true,
        ipfsUri: `ipfs://${localHash}`,
        ipfsHash: localHash,
        gatewayUrl: `http://localhost:${CONFIG.port}/api/ipfs/image/${localHash}`,
        storage: "local",
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.error("Image upload error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      requestId: req.requestId,
    });
  }
});

/**
 * Fetch metadata from IPFS or local storage
 * GET /api/ipfs/:cid
 */
app.get("/api/ipfs/:cid", async (req, res) => {
  try {
    const { cid } = req.params;
    
    // Check local storage first
    if (localMetadataStore.has(cid)) {
      const stored = localMetadataStore.get(cid);
      return res.json({
        success: true,
        data: stored.metadata || stored,
        storage: "local",
        requestId: req.requestId,
      });
    }
    
    // Try IPFS
    const result = await fetchFromIPFS(cid);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        storage: "ipfs",
        requestId: req.requestId,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Content not found",
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.error("IPFS fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch content",
      requestId: req.requestId,
    });
  }
});

/**
 * Serve local images
 * GET /api/ipfs/image/:cid
 */
app.get("/api/ipfs/image/:cid", (req, res) => {
  const { cid } = req.params;
  
  if (localImageStore.has(cid)) {
    const image = localImageStore.get(cid);
    res.setHeader("Content-Type", image.mimetype);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return res.send(image.buffer);
  }
  
  res.status(404).json({
    success: false,
    error: "Image not found",
    requestId: req.requestId,
  });
});

// ============ QR Code Endpoints ============

/**
 * Generate QR code for credential verification
 * POST /api/qr/generate
 */
app.post("/api/qr/generate", async (req, res) => {
  try {
    const { tokenId, contractAddress, chainId, baseUrl } = req.body;

    if (tokenId === undefined || tokenId === null) {
      return res.status(400).json({
        success: false,
        error: "Token ID is required",
        requestId: req.requestId,
      });
    }

    // Build verification URL
    const verifyBaseUrl = baseUrl || process.env.FRONTEND_URL || "http://localhost:3000";
    const params = new URLSearchParams({
      tokenId: tokenId.toString(),
      ...(contractAddress && { contract: contractAddress }),
      ...(chainId && { chainId: chainId.toString() }),
    });
    const verificationUrl = `${verifyBaseUrl}?${params}`;

    // Generate QR code
    const qrOptions = {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 2,
      width: 300,
      color: {
        dark: "#1F2937",
        light: "#FFFFFF",
      },
    };

    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, qrOptions);

    logger.info(`QR code generated for token ${tokenId}`);
    
    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      verificationUrl,
      tokenId,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("QR generation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate QR code",
      requestId: req.requestId,
    });
  }
});

// ============ Signature Verification Endpoints ============

/**
 * Verify an Ethereum signature
 * POST /api/signature/verify
 */
app.post("/api/signature/verify", (req, res) => {
  try {
    const validation = validators.signature(req.body);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: validation.error,
        requestId: req.requestId,
      });
    }

    logger.info(`Signature verified for ${validation.signer}`);
    
    res.json({
      success: true,
      verified: true,
      signer: validation.signer,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Signature verification error:", error);
    res.status(500).json({
      success: false,
      verified: false,
      error: "Verification failed",
      requestId: req.requestId,
    });
  }
});

/**
 * Generate a challenge message for signing
 * GET /api/signature/challenge
 */
app.get("/api/signature/challenge", (req, res) => {
  const { address, action } = req.query;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: "Address is required",
      requestId: req.requestId,
    });
  }
  
  const addressValidation = validators.ethereumAddress(address);
  if (!addressValidation.valid) {
    return res.status(400).json({
      success: false,
      error: addressValidation.error,
      requestId: req.requestId,
    });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const actionText = action || "authenticate";

  const message = [
    "VeriChain Authentication",
    "",
    `Action: ${actionText}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Timestamp: ${timestamp}`,
    "",
    "Sign this message to verify your identity.",
  ].join("\n");

  res.json({
    success: true,
    message,
    nonce,
    timestamp,
    expiresAt: timestamp + 300000, // 5 minutes
    requestId: req.requestId,
  });
});

// ============ Validation Endpoints ============

/**
 * Validate an Ethereum address
 * GET /api/validate/address/:address
 */
app.get("/api/validate/address/:address", (req, res) => {
  const validation = validators.ethereumAddress(req.params.address);
  
  res.json({
    valid: validation.valid,
    address: req.params.address,
    checksumAddress: validation.valid ? ethers.getAddress(req.params.address) : null,
    error: validation.error,
    requestId: req.requestId,
  });
});

// ============ Error Handling ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    requestId: req.requestId,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error [${req.requestId}]:`, err);

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: `File too large. Maximum size: ${CONFIG.maxFileSize / 1024 / 1024}MB`,
      requestId: req.requestId,
    });
  }

  if (err.message?.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: "CORS not allowed",
      requestId: req.requestId,
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    requestId: req.requestId,
  });
});

// ============ Server Startup ============

const server = app.listen(CONFIG.port, () => {
  logger.info("========================================");
  logger.info("VeriChain Backend Server v2.0.0");
  logger.info("========================================");
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`Port: ${CONFIG.port}`);
  logger.info(`Rate Limit: ${CONFIG.rateLimitMax} requests per ${CONFIG.rateLimitWindow / 60000} minutes`);
  logger.info("========================================");
  logger.info("Endpoints:");
  logger.info("  GET  /health              - Health check");
  logger.info("  GET  /api/status          - API status");
  logger.info("  POST /api/ipfs/metadata   - Upload metadata");
  logger.info("  POST /api/ipfs/image      - Upload image");
  logger.info("  GET  /api/ipfs/:cid       - Fetch from IPFS");
  logger.info("  POST /api/qr/generate     - Generate QR code");
  logger.info("  POST /api/signature/verify - Verify signature");
  logger.info("  GET  /api/signature/challenge - Get challenge");
  logger.info("  GET  /api/validate/address/:address - Validate address");
  logger.info("========================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
