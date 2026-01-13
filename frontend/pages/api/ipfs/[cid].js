/**
 * IPFS Fetch API Route
 * GET /api/ipfs/[cid]
 */

import { fetchFromIPFS } from "../../../utils/ipfs";

// Simple in-memory cache for fetched IPFS data
const ipfsCache = new Map();
const CACHE_TTL = 60000; // 1 minute

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cid } = req.query;

    if (!cid) {
      return res.status(400).json({
        success: false,
        error: "CID is required",
      });
    }

    // Check cache first
    const cached = ipfsCache.get(cid);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Handle local development storage (starts with QmLocal)
    if (cid.startsWith("QmLocal")) {
      // For local dev, return a placeholder since we can't share memory between serverless functions
      return res.json({
        success: true,
        data: {
          name: "Local Development Credential",
          description: "This credential was stored locally during development",
          _note: "In production, this would be fetched from IPFS",
        },
      });
    }

    // Fetch from IPFS
    const result = await fetchFromIPFS(cid);

    if (result.success) {
      // Cache the result
      ipfsCache.set(cid, { data: result.data, timestamp: Date.now() });
      
      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(404).json({
        success: false,
        error: result.error || "Content not found",
      });
    }
  } catch (error) {
    console.error("IPFS fetch error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
