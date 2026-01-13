/**
 * VeriChain IPFS Integration Module
 * Handles uploading credential metadata to IPFS via Pinata
 */

const axios = require("axios");
const FormData = require("form-data");

// Pinata API endpoints
const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_PIN_JSON = `${PINATA_API_URL}/pinning/pinJSONToIPFS`;
const PINATA_PIN_FILE = `${PINATA_API_URL}/pinning/pinFileToIPFS`;

/**
 * Creates the authorization headers for Pinata API
 */
function getPinataHeaders() {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Pinata API keys not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY.");
  }

  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: secretKey,
  };
}

/**
 * Credential metadata schema following VeriChain standard
 * @typedef {Object} CredentialMetadata
 * @property {string} name - Credential name (e.g., "Bachelor of Computer Science")
 * @property {string} description - Detailed description of the credential
 * @property {string} image - IPFS URI or URL of credential image/badge
 * @property {Object} attributes - Credential attributes
 * @property {string} attributes.credentialType - Type of credential
 * @property {string} attributes.issuingInstitution - Name of issuing institution
 * @property {string} attributes.institutionWallet - Wallet address of institution
 * @property {string} attributes.recipientWallet - Wallet address of recipient
 * @property {string} attributes.issueDate - ISO date string of issuance
 * @property {string} attributes.expirationDate - ISO date string of expiration (optional)
 * @property {boolean} attributes.revocable - Whether credential can be revoked
 * @property {Object} attributes.additionalData - Any additional credential-specific data
 */

/**
 * Creates a properly formatted credential metadata object
 * @param {Object} params - Credential parameters
 * @returns {CredentialMetadata} Formatted metadata object
 */
function createCredentialMetadata({
  name,
  description,
  image = "",
  credentialType,
  issuingInstitution,
  institutionWallet,
  recipientWallet,
  recipientName = "",
  issueDate = new Date().toISOString(),
  expirationDate = null,
  additionalData = {},
}) {
  return {
    name,
    description,
    image,
    external_url: "https://verichain.io", // Replace with actual URL
    attributes: [
      { trait_type: "Credential Type", value: credentialType },
      { trait_type: "Issuing Institution", value: issuingInstitution },
      { trait_type: "Institution Wallet", value: institutionWallet },
      { trait_type: "Recipient Wallet", value: recipientWallet },
      { trait_type: "Recipient Name", value: recipientName },
      { trait_type: "Issue Date", value: issueDate, display_type: "date" },
      { trait_type: "Revocable", value: "true" },
      ...(expirationDate
        ? [{ trait_type: "Expiration Date", value: expirationDate, display_type: "date" }]
        : []),
      ...Object.entries(additionalData).map(([key, value]) => ({
        trait_type: key,
        value: String(value),
      })),
    ],
    properties: {
      credentialType,
      issuingInstitution,
      institutionWallet,
      recipientWallet,
      issueDate,
      expirationDate,
      revocable: true,
      verichain_version: "1.0.0",
    },
  };
}

/**
 * Uploads credential metadata JSON to IPFS via Pinata
 * @param {CredentialMetadata} metadata - The credential metadata to upload
 * @returns {Promise<{success: boolean, ipfsHash: string, ipfsUri: string}>}
 */
async function uploadMetadataToIPFS(metadata) {
  try {
    const headers = getPinataHeaders();

    const response = await axios.post(
      PINATA_PIN_JSON,
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `VeriChain-Credential-${Date.now()}`,
          keyvalues: {
            type: "credential",
            recipient: metadata.properties?.recipientWallet || "unknown",
            institution: metadata.properties?.issuingInstitution || "unknown",
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      },
      { headers }
    );

    const ipfsHash = response.data.IpfsHash;
    return {
      success: true,
      ipfsHash,
      ipfsUri: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    };
  } catch (error) {
    console.error("IPFS upload error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Uploads an image file to IPFS via Pinata
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - Original file name
 * @returns {Promise<{success: boolean, ipfsHash: string, ipfsUri: string}>}
 */
async function uploadImageToIPFS(fileBuffer, fileName) {
  try {
    const headers = getPinataHeaders();
    const formData = new FormData();

    formData.append("file", fileBuffer, {
      filename: fileName,
    });

    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `VeriChain-Image-${Date.now()}`,
      })
    );

    formData.append(
      "pinataOptions",
      JSON.stringify({
        cidVersion: 1,
      })
    );

    const response = await axios.post(PINATA_PIN_FILE, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const ipfsHash = response.data.IpfsHash;
    return {
      success: true,
      ipfsHash,
      ipfsUri: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    };
  } catch (error) {
    console.error("Image upload error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Fetches metadata from IPFS
 * @param {string} ipfsUri - The IPFS URI (ipfs://... or CID)
 * @returns {Promise<Object>} The metadata object
 */
async function fetchFromIPFS(ipfsUri) {
  try {
    // Extract CID from URI
    const cid = ipfsUri.replace("ipfs://", "").replace("https://gateway.pinata.cloud/ipfs/", "");
    
    // Try multiple gateways for reliability
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await axios.get(gateway, { timeout: 10000 });
        return { success: true, data: response.data };
      } catch (e) {
        continue;
      }
    }

    throw new Error("All gateways failed");
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validates that a Pinata configuration is working
 * @returns {Promise<boolean>}
 */
async function validatePinataConfig() {
  try {
    const headers = getPinataHeaders();
    const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, { headers });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createCredentialMetadata,
  uploadMetadataToIPFS,
  uploadImageToIPFS,
  fetchFromIPFS,
  validatePinataConfig,
};
