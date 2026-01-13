/**
 * VeriChain Contract Utilities
 * Handles all blockchain interactions
 */

import { ethers } from "ethers";

// Contract ABI - only the functions we need
export const VERICHAIN_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function authorizedInstitutions(address) view returns (bool)",
  "function revokedCredentials(uint256) view returns (bool)",
  "function credentialIssuer(uint256) view returns (address)",
  "function issueTimestamp(uint256) view returns (uint256)",
  "function isAuthorizedInstitution(address institution) view returns (bool)",
  "function verifyCredential(uint256 tokenId) view returns (bool isValid, address issuer, address holder, uint256 issuedAt)",
  "function getCredentialsByHolder(address holder) view returns (uint256[])",
  "function owner() view returns (address)",
  
  // Write functions
  "function authorizeInstitution(address institution)",
  "function revokeInstitution(address institution)",
  "function issueCredential(address recipient, string uri) returns (uint256)",
  "function revokeCredential(uint256 tokenId)",
  
  // Events
  "event InstitutionAuthorized(address indexed institution, uint256 timestamp)",
  "event InstitutionRevoked(address indexed institution, uint256 timestamp)",
  "event CredentialIssued(uint256 indexed tokenId, address indexed recipient, address indexed issuer, string tokenURI, uint256 timestamp)",
  "event CredentialRevoked(uint256 indexed tokenId, address indexed revokedBy, uint256 timestamp)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// Network configurations
export const NETWORKS = {
  // Shardeum Mainnet (Primary)
  8118: {
    name: "Shardeum",
    chainId: 8118,
    rpcUrl: "https://api.shardeum.org",
    blockExplorer: "https://explorer.shardeum.org",
    currency: { name: "SHM", symbol: "SHM", decimals: 18 },
  },
  // Shardeum Testnet (Mezame)
  8119: {
    name: "Shardeum Testnet",
    chainId: 8119,
    rpcUrl: "https://api-mezame.shardeum.org",
    blockExplorer: "https://explorer-mezame.shardeum.org",
    currency: { name: "SHM", symbol: "SHM", decimals: 18 },
  },
  // Polygon Amoy Testnet
  80002: {
    name: "Polygon Amoy",
    chainId: 80002,
    rpcUrl: "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
    currency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  // Arbitrum Sepolia Testnet
  421614: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    blockExplorer: "https://sepolia.arbiscan.io",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
  // Local Hardhat
  31337: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
};

// Default contract address (update after deployment)
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "8118"); // Default to Shardeum Mainnet

// API URL - use relative paths for Vercel compatibility, or full URL for local backend
export const API_BASE_URL = typeof window !== "undefined" 
  ? "" // Client-side: use relative paths (works on Vercel)
  : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"); // Server-side fallback

// Backward compatibility alias
export const BACKEND_URL = API_BASE_URL;

/**
 * Get the current network configuration
 */
export function getNetworkConfig(chainId = CHAIN_ID) {
  return NETWORKS[chainId] || NETWORKS[80002];
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled() {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum && window.ethereum.isMetaMask);
}

/**
 * Get the ethereum provider
 */
export function getEthereumProvider() {
  if (typeof window === "undefined") return null;
  
  // Handle multiple wallets
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find((p) => p.isMetaMask) || window.ethereum.providers[0];
  }
  
  return window.ethereum || null;
}

/**
 * Connect to MetaMask and return signer
 */
export async function connectWallet() {
  const ethereum = getEthereumProvider();
  
  if (!ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask from https://metamask.io");
  }

  try {
    // Request accounts
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please unlock MetaMask and try again.");
    }

    // Create provider and signer
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    console.log("Wallet connected:", address, "Chain:", Number(network.chainId));

    return {
      provider,
      signer,
      address,
      chainId: Number(network.chainId),
    };
  } catch (err) {
    console.error("Wallet connection error:", err);
    
    if (err.code === 4001) {
      throw new Error("Connection rejected. Please approve the connection in MetaMask.");
    }
    if (err.code === -32002) {
      throw new Error("Connection request pending. Please check MetaMask.");
    }
    
    throw new Error(err.message || "Failed to connect wallet");
  }
}

/**
 * Switch to the correct network
 */
export async function switchNetwork(targetChainId = CHAIN_ID) {
  const ethereum = getEthereumProvider();
  
  if (!ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const chainIdHex = `0x${targetChainId.toString(16)}`;
  const networkConfig = getNetworkConfig(targetChainId);

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    console.log("Switched to network:", networkConfig.name);
  } catch (switchError) {
    // Chain not added (4902) or unrecognized chain, try to add it
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              nativeCurrency: networkConfig.currency,
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : [],
            },
          ],
        });
        console.log("Added network:", networkConfig.name);
      } catch (addError) {
        console.error("Failed to add network:", addError);
        throw new Error(`Failed to add ${networkConfig.name} network. Please add it manually.`);
      }
    } else if (switchError.code === 4001) {
      throw new Error("Network switch rejected by user.");
    } else {
      throw switchError;
    }
  }
}

/**
 * Get a read-only contract instance
 */
export function getReadOnlyContract(contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  const network = getNetworkConfig(chainId);
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  return new ethers.Contract(contractAddress, VERICHAIN_ABI, provider);
}

/**
 * Get a contract instance (alias for getReadOnlyContract for event listening)
 */
export async function getContract(contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  return getReadOnlyContract(contractAddress, chainId);
}

/**
 * Get a contract instance with signer for write operations
 */
export function getContractWithSigner(signer, contractAddress = CONTRACT_ADDRESS) {
  return new ethers.Contract(contractAddress, VERICHAIN_ABI, signer);
}

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCredentialCache() {
  cache.clear();
}

/**
 * Verify a credential by token ID (optimized with parallel calls)
 */
export async function verifyCredential(tokenId, contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  const cacheKey = `verify_${tokenId}_${contractAddress}_${chainId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const contract = getReadOnlyContract(contractAddress, chainId);
  
  try {
    // Execute all read calls in parallel for faster response
    const [verifyResult, tokenURI, isRevoked] = await Promise.all([
      contract.verifyCredential(tokenId),
      contract.tokenURI(tokenId),
      contract.revokedCredentials(tokenId),
    ]);
    
    const [isValid, issuer, holder, issuedAt] = verifyResult;
    
    // Check institution auth in parallel with result formatting
    const isInstitutionAuthorized = await contract.isAuthorizedInstitution(issuer);
    
    const result = {
      success: true,
      tokenId: Number(tokenId),
      isValid,
      issuer,
      holder,
      issuedAt: Number(issuedAt),
      issuedAtDate: new Date(Number(issuedAt) * 1000),
      tokenURI,
      isRevoked,
      isInstitutionAuthorized,
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get all credentials for a wallet address (optimized with parallel fetching)
 */
export async function getCredentialsByWallet(walletAddress, contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  const cacheKey = `wallet_${walletAddress}_${contractAddress}_${chainId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const contract = getReadOnlyContract(contractAddress, chainId);
  
  try {
    const tokenIds = await contract.getCredentialsByHolder(walletAddress);
    
    // Fetch all credentials in parallel instead of sequentially
    const credentialPromises = tokenIds.map(tokenId => 
      verifyCredential(tokenId, contractAddress, chainId)
    );
    
    const results = await Promise.all(credentialPromises);
    const credentials = results.filter(result => result.success);
    
    const result = {
      success: true,
      wallet: walletAddress,
      credentials,
      count: credentials.length,
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch verify multiple credentials at once (for lists)
 */
export async function batchVerifyCredentials(tokenIds, contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  const promises = tokenIds.map(id => verifyCredential(id, contractAddress, chainId));
  return Promise.all(promises);
}

/**
 * Check if an address is an authorized institution
 */
export async function checkInstitutionStatus(address, contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  const contract = getReadOnlyContract(contractAddress, chainId);
  
  try {
    const isAuthorized = await contract.isAuthorizedInstitution(address);
    const owner = await contract.owner();
    const isOwner = owner.toLowerCase() === address.toLowerCase();
    
    return {
      success: true,
      address,
      isAuthorized,
      isOwner,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Issue a new credential
 */
export async function issueCredential(signer, recipientAddress, tokenURI, contractAddress = CONTRACT_ADDRESS) {
  const contract = getContractWithSigner(signer, contractAddress);
  
  try {
    const tx = await contract.issueCredential(recipientAddress, tokenURI);
    const receipt = await tx.wait();
    
    // Find the CredentialIssued event
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "CredentialIssued"
    );
    
    const tokenId = event ? Number(event.args[0]) : null;
    
    return {
      success: true,
      transactionHash: receipt.hash,
      tokenId,
      recipient: recipientAddress,
      tokenURI,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Revoke a credential
 */
export async function revokeCredential(signer, tokenId, contractAddress = CONTRACT_ADDRESS) {
  const contract = getContractWithSigner(signer, contractAddress);
  
  try {
    const tx = await contract.revokeCredential(tokenId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
      tokenId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Fetch metadata from IPFS via API route
 */
export async function fetchMetadata(tokenURI) {
  try {
    // Extract CID from ipfs:// URI
    const cid = tokenURI.replace("ipfs://", "");
    
    const response = await fetch(`${API_BASE_URL}/api/ipfs/${cid}`);
    const data = await response.json();
    
    if (data.success) {
      return { success: true, metadata: data.data };
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    // Fallback to direct IPFS gateway
    try {
      const cid = tokenURI.replace("ipfs://", "");
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const metadata = await response.json();
      return { success: true, metadata };
    } catch (fallbackError) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Upload metadata to IPFS via API route
 */
export async function uploadMetadata(metadata) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ipfs/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate QR code for verification
 */
export async function generateQRCode(tokenId, contractAddress = CONTRACT_ADDRESS, chainId = CHAIN_ID) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId, contractAddress, chainId }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Format address for display
 */
export function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerUrl(txHash, chainId = CHAIN_ID) {
  const network = getNetworkConfig(chainId);
  if (!network.blockExplorer) return null;
  return `${network.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
export function getAddressExplorerUrl(address, chainId = CHAIN_ID) {
  const network = getNetworkConfig(chainId);
  if (!network.blockExplorer) return null;
  return `${network.blockExplorer}/address/${address}`;
}
