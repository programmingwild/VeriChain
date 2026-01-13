/**
 * VeriChain IPFS Integration Module
 * Handles uploading credential metadata to IPFS via Pinata
 * 
 * Works both client-side (with NEXT_PUBLIC_ env vars) and server-side (with regular env vars)
 */

// Pinata API endpoints
const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_PIN_JSON = `${PINATA_API_URL}/pinning/pinJSONToIPFS`;
const PINATA_PIN_FILE = `${PINATA_API_URL}/pinning/pinFileToIPFS`;

/**
 * Gets Pinata headers from environment variables
 * Works with both NEXT_PUBLIC_ (client) and regular (server) env vars
 */
function getPinataHeaders() {
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY;
  const secretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Pinata API keys not configured");
  }

  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: secretKey,
  };
}

/**
 * Creates a properly formatted credential metadata object
 */
export function createCredentialMetadata({
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
    external_url: "https://verichain.io",
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
 */
export async function uploadMetadataToIPFS(metadata) {
  try {
    const headers = getPinataHeaders();

    const response = await fetch(PINATA_PIN_JSON, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Pinata upload failed");
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    
    return {
      success: true,
      ipfsHash,
      ipfsUri: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    };
  } catch (error) {
    console.error("IPFS upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Fetches metadata from IPFS via multiple gateways
 */
export async function fetchFromIPFS(ipfsUri) {
  try {
    const cid = ipfsUri.replace("ipfs://", "").replace("https://gateway.pinata.cloud/ipfs/", "");
    
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    for (const gateway of gateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(gateway, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error("All IPFS gateways failed");
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validates Pinata configuration
 */
export async function validatePinataConfig() {
  try {
    const headers = getPinataHeaders();
    const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
      headers,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
