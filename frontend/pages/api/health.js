/**
 * Health Check API Route
 * GET /api/health
 */

import { validatePinataConfig } from "../../utils/ipfs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pinataOk = await validatePinataConfig();
    
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        ipfs: pinataOk ? "connected" : "disconnected",
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
}
