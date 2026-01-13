/**
 * QR Code Generation API Route
 * POST /api/qr/generate
 */

import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tokenId, contractAddress } = req.body;

    if (tokenId === undefined || !contractAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tokenId, contractAddress",
      });
    }

    // Get the base URL from environment or request headers
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.host || "localhost:3000";
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || `${protocol}://${host}`;

    // Create verification URL
    const verificationUrl = `${baseUrl}/verify/${tokenId}?autoDownload=true`;

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
    console.error("QR generation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
