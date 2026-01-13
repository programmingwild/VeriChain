/**
 * Auth Nonce API Route
 * GET /api/auth/nonce
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const nonce = `VeriChain Authentication\nNonce: ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  return res.json({
    success: true,
    nonce,
    timestamp: Date.now(),
  });
}
