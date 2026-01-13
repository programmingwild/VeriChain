/**
 * VeriChain - Inco FHE Integration
 * 
 * Based on official Inco documentation: https://docs.inco.org/
 * 
 * Uses:
 * - @inco/js for the Lightning SDK
 * - Base Sepolia network (chainId: 84532)
 * 
 * Key APIs from Inco:
 * - Lightning.latest('testnet', chainId) - Initialize SDK
 * - zap.encrypt(value, options) - Encrypt values
 * - zap.attestedDecrypt(walletClient, handles) - Decrypt with attestation
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// ============ CONFIGURATION ============

const INCO_CONFIG = {
  // Enable real FHE - requires Base Sepolia network
  USE_REAL_FHE: process.env.NEXT_PUBLIC_USE_INCO_FHE === 'true',
  
  // Inco works on Base Sepolia
  CHAIN_ID: 84532,
  CHAIN_NAME: 'Base Sepolia',
  RPC_URL: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  
  // Explorer
  EXPLORER_URL: 'https://sepolia.basescan.org',
};

// ============ DYNAMIC INCO IMPORTS ============

let incoModules = null;
let lightningInstance = null;
let isIncoInitialized = false;

/**
 * Dynamically import Inco modules (only when needed)
 */
async function loadIncoModules() {
  if (incoModules) return incoModules;

  try {
    // Import from @inco/js as per documentation
    const incoJs = await import('@inco/js');
    const incoLite = await import('@inco/js/lite');
    const viem = await import('viem');
    const viemChains = await import('viem/chains');

    incoModules = {
      Lightning: incoLite.Lightning,
      handleTypes: incoJs.handleTypes,
      supportedChains: incoJs.supportedChains,
      getViemChain: incoJs.getViemChain,
      createWalletClient: viem.createWalletClient,
      createPublicClient: viem.createPublicClient,
      http: viem.http,
      custom: viem.custom,
      baseSepolia: viemChains.baseSepolia,
    };

    console.log('[Inco] Modules loaded successfully');
    return incoModules;
  } catch (error) {
    console.error('[Inco] Failed to load modules:', error);
    throw new Error(`Failed to load Inco SDK: ${error.message}`);
  }
}

/**
 * Initialize the Inco Lightning SDK
 * Based on: https://docs.inco.org/js-sdk/encryption
 */
async function initializeLightning() {
  if (lightningInstance && isIncoInitialized) {
    return lightningInstance;
  }

  const modules = await loadIncoModules();
  
  // Initialize Lightning SDK with testnet and Base Sepolia chain ID
  // As per docs: Lightning.latest('testnet', chainId)
  const chainId = modules.supportedChains.baseSepolia;
  lightningInstance = await modules.Lightning.latest('testnet', chainId);
  isIncoInitialized = true;

  console.log('[Inco] Lightning SDK initialized for chain:', chainId);
  return lightningInstance;
}

/**
 * Create a viem wallet client for Inco operations
 */
async function createIncoWalletClient() {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet detected');
  }

  const modules = await loadIncoModules();
  
  // Get the connected account
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  const walletClient = modules.createWalletClient({
    chain: modules.getViemChain(modules.supportedChains.baseSepolia),
    transport: modules.custom(window.ethereum),
    account: accounts[0],
  });

  return walletClient;
}

// ============ ENCRYPTION FUNCTIONS ============

/**
 * Encrypt a value using Inco FHE
 * Based on: https://docs.inco.org/js-sdk/encryption
 * 
 * @param {bigint|number|boolean} value - Value to encrypt
 * @param {Object} options - Encryption options
 * @param {string} options.accountAddress - User's wallet address
 * @param {string} options.dappAddress - Contract address
 * @param {string} options.handleType - Type of handle (euint256, ebool, euint160)
 */
async function encryptWithInco(value, options) {
  const zap = await initializeLightning();
  const modules = await loadIncoModules();

  const { accountAddress, dappAddress, handleType = 'euint256' } = options;

  // Get the handle type from Inco
  const incoHandleType = modules.handleTypes[handleType] || modules.handleTypes.euint256;

  // Convert value to appropriate type
  let encryptValue = value;
  if (typeof value === 'string') {
    // Hash strings to get a numeric representation
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    // Take first 8 bytes for uint64 representation
    let numValue = BigInt(0);
    for (let i = 0; i < 8; i++) {
      numValue = (numValue << BigInt(8)) | BigInt(hashArray[i]);
    }
    encryptValue = numValue;
  } else if (typeof value === 'number') {
    encryptValue = BigInt(value);
  }

  // Encrypt using Inco Lightning SDK
  // As per docs: zap.encrypt(value, { accountAddress, dappAddress, handleType })
  const ciphertext = await zap.encrypt(encryptValue, {
    accountAddress,
    dappAddress,
    handleType: incoHandleType,
  });

  console.log('[Inco] Value encrypted successfully');

  return {
    ciphertext,
    handle: ciphertext, // The ciphertext IS the handle in Inco
    isSimulated: false,
  };
}

/**
 * Decrypt handles using Inco attested decrypt
 * Based on: https://docs.inco.org/js-sdk/attestations/attested-decrypt
 * 
 * @param {string[]} handles - Array of encrypted handles to decrypt
 * @param {Object} walletClient - Viem wallet client (or will create one)
 */
async function decryptWithInco(handles, walletClient = null) {
  const zap = await initializeLightning();
  
  // Create wallet client if not provided
  if (!walletClient) {
    walletClient = await createIncoWalletClient();
  }

  // Request attested decrypt
  // As per docs: zap.attestedDecrypt(walletClient, handles)
  const results = await zap.attestedDecrypt(
    walletClient,
    handles
  );

  // Extract plaintext values
  const plaintexts = results.map(result => ({
    value: result.plaintext.value,
    handle: result.handle,
  }));

  console.log('[Inco] Values decrypted successfully');

  return plaintexts;
}

// ============ SIMULATED FHE (for local development) ============

/**
 * Simulated encryption for local development
 * Uses SHA-256 hashing to create deterministic "encrypted" values
 */
async function simulateEncrypt(value, options = {}) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ 
    value: value.toString(), 
    timestamp: Date.now(),
    address: options.accountAddress || '0x0',
    contract: options.dappAddress || '0x0',
    salt: Math.random().toString(36)
  }));
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    ciphertext: hashHex,
    handle: hashHex.slice(0, 66), // bytes32 format
    isSimulated: true,
  };
}

function simulateDecrypt(handles) {
  return handles.map(handle => ({
    value: null, // Cannot actually decrypt simulated values
    handle,
    error: 'Cannot decrypt simulated values - use real Inco FHE on Base Sepolia',
  }));
}

// ============ MAIN ENCRYPTION INTERFACE ============

// Pre-loading promise for background initialization
let preloadPromise = null;

/**
 * Pre-load Inco modules in background (call early)
 */
export function preloadIncoModules() {
  if (preloadPromise) return preloadPromise;
  if (incoModules) return Promise.resolve(incoModules);
  
  // Start loading in background without blocking
  preloadPromise = loadIncoModules().catch(err => {
    console.warn('[Inco] Background preload failed:', err.message);
    return null;
  });
  return preloadPromise;
}

/**
 * VeriChain Encryption - Main interface
 * Automatically uses real Inco FHE or simulation based on configuration
 */
export const VeriChainEncryption = {
  initialized: false,
  initializing: false,
  initPromise: null,
  useRealFHE: INCO_CONFIG.USE_REAL_FHE,

  /**
   * Initialize the encryption system
   */
  async init() {
    // Return existing initialization if already done
    if (this.initialized) return this;
    
    // Return existing promise if initialization in progress
    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }

    this.initializing = true;
    this.initPromise = this._doInit();
    return this.initPromise;
  },

  async _doInit() {
    if (this.useRealFHE) {
      try {
        await initializeLightning();
        console.log('[VeriChain] ✅ Real Inco FHE enabled (Base Sepolia)');
      } catch (error) {
        console.warn('[VeriChain] ⚠️ Real FHE failed, using simulation:', error.message);
        this.useRealFHE = false;
      }
    } else {
      console.log('[VeriChain] 🔓 Simulation mode (set NEXT_PUBLIC_USE_INCO_FHE=true for real FHE)');
    }

    this.initialized = true;
    this.initializing = false;
    return this;
  },

  /**
   * Check if using real FHE
   */
  isRealFHE() {
    return this.useRealFHE && isIncoInitialized;
  },

  /**
   * Get configuration info
   */
  getConfig() {
    return {
      ...INCO_CONFIG,
      isInitialized: this.initialized,
      isRealFHE: this.isRealFHE(),
    };
  },

  /**
   * Encrypt a single value
   * @param {any} value - Value to encrypt
   * @param {Object} options - { accountAddress, dappAddress, handleType }
   */
  async encrypt(value, options = {}) {
    if (!this.initialized) await this.init();
    
    if (this.useRealFHE) {
      return encryptWithInco(value, options);
    }
    return simulateEncrypt(value, options);
  },

  /**
   * Decrypt handles
   * @param {string[]} handles - Array of handles to decrypt
   * @param {Object} walletClient - Optional viem wallet client
   */
  async decrypt(handles, walletClient = null) {
    if (!this.initialized) await this.init();
    
    const handleArray = Array.isArray(handles) ? handles : [handles];
    
    if (this.useRealFHE) {
      return decryptWithInco(handleArray, walletClient);
    }
    return simulateDecrypt(handleArray);
  },

  /**
   * Encrypt credential private data (PARALLEL for speed)
   * @param {Object} data - { studentId, grade, personalData }
   * @param {Object} options - { address, contractAddress }
   */
  async encryptCredentialData(data, options) {
    if (!this.initialized) await this.init();

    const { studentId, grade, personalData } = data;
    const { address, contractAddress } = options;
    const results = {};

    const encryptOptions = {
      accountAddress: address,
      dappAddress: contractAddress,
      handleType: 'euint256',
    };

    // Encrypt ALL fields in PARALLEL for faster processing
    const encryptionTasks = [];
    const taskKeys = [];

    if (studentId) {
      encryptionTasks.push(this.encrypt(studentId, encryptOptions));
      taskKeys.push('encryptedStudentId');
    }

    if (grade) {
      encryptionTasks.push(this.encrypt(grade, encryptOptions));
      taskKeys.push('encryptedGrade');
    }

    if (personalData) {
      const serialized = JSON.stringify(personalData);
      encryptionTasks.push(this.encrypt(serialized, encryptOptions));
      taskKeys.push('encryptedPersonalData');
    }

    // Wait for all encryptions at once
    if (encryptionTasks.length > 0) {
      const encrypted = await Promise.all(encryptionTasks);
      encrypted.forEach((result, index) => {
        results[taskKeys[index]] = result.handle;
      });
    }

    results.isSimulated = !this.useRealFHE;
    return results;
  },

  /**
   * Decrypt credential private data
   */
  async decryptCredentialData(handles, walletClient = null) {
    if (!this.initialized) await this.init();

    const handleArray = [];
    const fieldMap = {};

    if (handles.encryptedStudentId) {
      handleArray.push(handles.encryptedStudentId);
      fieldMap[handles.encryptedStudentId] = 'studentId';
    }
    if (handles.encryptedGrade) {
      handleArray.push(handles.encryptedGrade);
      fieldMap[handles.encryptedGrade] = 'grade';
    }
    if (handles.encryptedPersonalData) {
      handleArray.push(handles.encryptedPersonalData);
      fieldMap[handles.encryptedPersonalData] = 'personalData';
    }

    const decrypted = await this.decrypt(handleArray, walletClient);
    
    const results = {};
    decrypted.forEach(item => {
      const field = fieldMap[item.handle];
      if (field === 'personalData' && item.value) {
        try {
          results[field] = JSON.parse(item.value);
        } catch {
          results[field] = item.value;
        }
      } else {
        results[field] = item.value;
      }
    });

    results.isSimulated = !this.useRealFHE;
    return results;
  },
};

// ============ REACT HOOK ============

// Cache the hook state across component remounts
let cachedHookState = null;

/**
 * React hook for VeriChain encryption
 * Uses cached state to avoid re-initialization on remounts
 */
export function useVeriChainEncryption() {
  const [state, setState] = useState(() => 
    cachedHookState || {
      initialized: false,
      isRealFHE: false,
      fee: '0',
      loading: true,
      error: null,
    }
  );

  useEffect(() => {
    // Skip initialization if already cached
    if (cachedHookState?.initialized) {
      setState(cachedHookState);
      return;
    }

    // Use existing initialization if in progress
    async function init() {
      try {
        await VeriChainEncryption.init();
        
        const newState = {
          initialized: true,
          isRealFHE: VeriChainEncryption.isRealFHE(),
          fee: VeriChainEncryption.isRealFHE() ? '0.001' : '0.0001',
          loading: false,
          error: null,
        };
        
        cachedHookState = newState;
        setState(newState);
      } catch (error) {
        const errorState = {
          initialized: false,
          isRealFHE: false,
          fee: '0',
          loading: false,
          error: error.message,
        };
        setState(errorState);
      }
    }
    init();
  }, []);

  const encryptCredentialData = useCallback(async (data, options) => {
    return VeriChainEncryption.encryptCredentialData(data, options);
  }, []);

  const decryptCredentialData = useCallback(async (handles, walletClient) => {
    return VeriChainEncryption.decryptCredentialData(handles, walletClient);
  }, []);

  return {
    ...state,
    encryptCredentialData,
    decryptCredentialData,
    encrypt: VeriChainEncryption.encrypt.bind(VeriChainEncryption),
    decrypt: VeriChainEncryption.decrypt.bind(VeriChainEncryption),
    getConfig: VeriChainEncryption.getConfig.bind(VeriChainEncryption),
  };
}

// ============ HELPER FUNCTIONS ============

/**
 * Truncate a hash for display
 */
export function truncateHash(hash, chars = 8) {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(hash, type = 'tx') {
  return `${INCO_CONFIG.EXPLORER_URL}/${type}/${hash}`;
}

/**
 * Check if wallet is on the correct network for Inco
 */
export async function checkNetwork() {
  if (!window.ethereum) return { isCorrect: false, error: 'No wallet' };
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    return {
      isCorrect: currentChainId === INCO_CONFIG.CHAIN_ID,
      current: currentChainId,
      required: INCO_CONFIG.CHAIN_ID,
      requiredName: INCO_CONFIG.CHAIN_NAME,
    };
  } catch (error) {
    return { isCorrect: false, error: error.message };
  }
}

/**
 * Request network switch to Base Sepolia
 */
export async function switchToBaseSepolia() {
  if (!window.ethereum) throw new Error('No wallet detected');

  const chainIdHex = `0x${INCO_CONFIG.CHAIN_ID.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: 'Base Sepolia',
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://sepolia.base.org'],
          blockExplorerUrls: ['https://sepolia.basescan.org'],
        }],
      });
      return true;
    }
    throw switchError;
  }
}

export default VeriChainEncryption;
