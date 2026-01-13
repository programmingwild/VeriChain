/**
 * Wallet QR Code Generation API Route
 * GET /api/qr/wallet/[address]
 */

import QRCode from "qrcode";
import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address, contractAddress, chainId } = req.query;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    // Get the base URL from environment or request headers
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.host || "localhost:3000";
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || `${protocol}://${host}`;

    // Create verification URL
    let verificationUrl = `${baseUrl}/verify?wallet=${address}`;
    if (contractAddress) verificationUrl += `&contract=${contractAddress}`;
    if (chainId) verificationUrl += `&chain=${chainId}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#2D2E3A",
        light: "#F4EBD3",
      },
    });

    return res.json({
      success: true,
      qrCode: qrDataUrl,
      verificationUrl,
    });
  } catch (error) {
    console.error("Wallet QR generation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
