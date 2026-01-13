/**
 * Signature Verification API Route
 * POST /api/verify-signature
 */

import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    return res.json({
      success: true,
      isValid,
      recoveredAddress,
      expectedAddress,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Invalid signature",
    });
  }
}
