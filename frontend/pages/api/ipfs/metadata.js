/**
 * IPFS Metadata Upload API Route
 * POST /api/ipfs/metadata
 */

import { createCredentialMetadata, uploadMetadataToIPFS } from "../../../utils/ipfs";

// In-memory storage for local development fallback
const localMetadataStore = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // Try IPFS upload
    const result = await uploadMetadataToIPFS(metadata);

    if (result.success) {
      return res.json({
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
      
      return res.json({
        success: true,
        ipfsUri: `ipfs://${localHash}`,
        ipfsHash: localHash,
        gatewayUrl: `/api/ipfs/${localHash}`,
        metadata,
        _note: "Stored locally (IPFS not configured)",
      });
    }
  } catch (error) {
    console.error("Metadata upload error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// Export local store for the fetch endpoint
export { localMetadataStore };
