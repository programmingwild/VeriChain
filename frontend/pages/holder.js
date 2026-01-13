/**
 * VeriChain Holder Portal
 * Read-only achievement dashboard - View credentials on blockchain
 * 
 * CORE LOGIC:
 * 1. User opens this portal
 * 2. Clicks "Connect Wallet" (or uses Demo Mode)
 * 3. Portal queries the smart contract for credentials owned by that wallet
 * 4. Displays all certificates - READ ONLY, no creation/management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import {
  connectWallet,
  getCredentialsByWallet,
  fetchMetadata,
  formatAddress,
  getNetworkConfig,
  CONTRACT_ADDRESS,
  CHAIN_ID,
  isMetaMaskInstalled,
  switchNetwork,
  getContract,
  clearCredentialCache,
} from "../utils/contract";
import CredentialCard from "../components/CredentialCard";
import BackButton from "../components/BackButton";

export default function HolderPortal() {
  const router = useRouter();
  const { isDemoUser, user } = useAuth();
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const isProcessingRef = useRef(false); // Prevent double-clicks

  useEffect(() => {
    setMounted(true);
  }, []);

  // In demo mode, auto-set wallet address and load demo credentials
  useEffect(() => {
    if (mounted && isDemoUser) {
      setWalletAddress(user?.address || '0xDEMO0000000000000000000000000000HOLDER');
      loadDemoCredentials();
    }
  }, [mounted, isDemoUser, user]);

  // Load demo credentials from localStorage
  const loadDemoCredentials = useCallback(() => {
    try {
      const demoCredentials = JSON.parse(localStorage.getItem('demo_credentials') || '[]');
      const formattedCredentials = demoCredentials.map((cred, index) => ({
        tokenId: cred.tokenId || index + 1,
        issuer: cred.issuer || 'Demo Institution',
        recipient: cred.recipient || user?.address,
        credentialType: cred.credentialType || 'certificate',
        achievementName: cred.achievementName || 'Demo Credential',
        achievementDescription: cred.achievementDescription || '',
        issuedAt: cred.issuedAt || new Date().toISOString(),
        tokenURI: '',
        metadata: {
          name: cred.achievementName,
          description: cred.achievementDescription,
          recipientName: cred.recipientName,
          hasPrivateData: cred.hasPrivateData,
        },
        isDemo: true,
      }));
      setCredentials(formattedCredentials);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error loading demo credentials:", err);
    }
  }, [user]);

  // Check if already connected (non-demo mode)
  useEffect(() => {
    if (mounted && !isDemoUser && typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      }).catch(console.error);
    }
  }, [mounted, isDemoUser]);

  // Fetch credentials when wallet is connected (non-demo mode)
  useEffect(() => {
    if (walletAddress && !isDemoUser) {
      fetchCredentialsFromBlockchain();
    }
  }, [walletAddress, isDemoUser]);

  // Listen for account changes (non-demo mode only)
  useEffect(() => {
    if (mounted && !isDemoUser && typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
          setCredentials([]);
        } else {
          setWalletAddress(accounts[0]);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [mounted]);

  const handleConnectWallet = async () => {
    // In demo mode, just load demo credentials
    if (isDemoUser) {
      loadDemoCredentials();
      return;
    }
    
    // Prevent double-clicks
    if (isProcessingRef.current || connecting) return;
    isProcessingRef.current = true;
    
    setConnecting(true);
    setError("");

    try {
      if (!isMetaMaskInstalled()) {
        throw new Error("Please install MetaMask to use this portal. Visit https://metamask.io");
      }

      // Connect wallet
      const { address, chainId } = await connectWallet();
      
      // Check if on correct network
      if (chainId !== CHAIN_ID) {
        await switchNetwork(CHAIN_ID);
      }

      setWalletAddress(address);
    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
      isProcessingRef.current = false;
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setCredentials([]);
    setError("");
  };

  const handleRefresh = () => {
    if (isDemoUser) {
      loadDemoCredentials();
    } else {
      fetchCredentialsFromBlockchain();
    }
  };

  const fetchCredentialsFromBlockchain = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError("");

    try {
      // Query blockchain for credentials owned by this wallet
      const result = await getCredentialsByWallet(walletAddress, CONTRACT_ADDRESS, CHAIN_ID);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Fetch metadata for each credential
      const credentialsWithMetadata = await Promise.all(
        result.credentials.map(async (cred) => {
          const metadataResult = await fetchMetadata(cred.tokenURI);
          return {
            ...cred,
            metadata: metadataResult.success ? metadataResult.metadata : null,
          };
        })
      );

      setCredentials(credentialsWithMetadata);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch credentials from blockchain");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Real-time: Listen for credential events on the blockchain
  useEffect(() => {
    if (!walletAddress || !mounted) return;

    let contract;
    let isSubscribed = true;

    const setupEventListeners = async () => {
      try {
        contract = await getContract(CONTRACT_ADDRESS, CHAIN_ID);
        if (!contract) return;

        // Listen for new credentials issued to this wallet
        const handleCredentialIssued = (tokenId, holder, issuer, event) => {
          if (isSubscribed && holder.toLowerCase() === walletAddress.toLowerCase()) {
            console.log("🆕 New credential issued to you:", tokenId.toString());
            fetchCredentialsFromBlockchain();
          }
        };

        // Listen for credential revocations
        const handleCredentialRevoked = (tokenId, event) => {
          if (isSubscribed) {
            console.log("⚠️ Credential revoked:", tokenId.toString());
            fetchCredentialsFromBlockchain();
          }
        };

        contract.on("CredentialIssued", handleCredentialIssued);
        contract.on("CredentialRevoked", handleCredentialRevoked);

        return () => {
          isSubscribed = false;
          if (contract) {
            contract.off("CredentialIssued", handleCredentialIssued);
            contract.off("CredentialRevoked", handleCredentialRevoked);
          }
        };
      } catch (err) {
        console.error("Event listener setup error:", err);
      }
    };

    setupEventListeners();

    return () => {
      isSubscribed = false;
    };
  }, [walletAddress, mounted, fetchCredentialsFromBlockchain]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!walletAddress || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchCredentialsFromBlockchain();
    }, 30000);

    return () => clearInterval(interval);
  }, [walletAddress, autoRefresh, fetchCredentialsFromBlockchain]);

  const network = getNetworkConfig(CHAIN_ID);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Holder Portal - VeriChain</title>
        <meta name="description" content="View your blockchain credentials" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 py-4" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton fallbackPath="/" />
              <Link href="/" className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>VeriChain</span>
                  <span className="text-sm block" style={{ color: 'var(--text-tertiary)' }}>Holder Portal</span>
                </div>
              </Link>
            </div>

            {walletAddress ? (
              <div className="flex items-center gap-3">
                <div 
                  className="px-4 py-2 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--acrylic-border)' }}
                >
                  <span className="text-xs block" style={{ color: 'var(--text-tertiary)' }}>Connected</span>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatAddress(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-normal"
                  style={{ background: 'var(--error-subtle)', color: 'var(--error)' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                Institution Login →
              </Link>
            )}
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          {!walletAddress && (
            <div className="text-center mb-12 animate-fade-in-down">
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
              >
                <span className="text-4xl">🎓</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Your Achievement Portfolio
              </h1>
              <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
                Connect your wallet to view all blockchain credentials issued to your address.
                No sign-up required — your wallet is your identity.
              </p>

              {/* Connect Wallet Button */}
              <button
                onClick={handleConnectWallet}
                disabled={connecting}
                className="btn-primary px-8 py-4 text-lg rounded-xl inline-flex items-center gap-3"
              >
                {connecting ? (
                  <>
                    <div className="loading-spinner w-5 h-5"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>

              {error && (
                <div className="mt-6 max-w-md mx-auto glass-card p-4 rounded-lg animate-shake" style={{ background: 'var(--error-subtle)', border: '1px solid rgba(184, 92, 92, 0.3)' }}>
                  <p className="text-sm" style={{ color: 'var(--error)' }}>⚠️ {error}</p>
                </div>
              )}

              {/* How It Works */}
              <div className="mt-16 grid md:grid-cols-4 gap-4">
                {[
                  { icon: "🔗", title: "Connect Wallet", desc: "Use MetaMask or any Web3 wallet" },
                  { icon: "⛓️", title: "Query Blockchain", desc: "We check the smart contract" },
                  { icon: "📜", title: "Fetch Credentials", desc: "All certificates owned by you" },
                  { icon: "👁️", title: "View & Share", desc: "Download or share your achievements" },
                ].map((step, idx) => (
                  <div 
                    key={idx}
                    className="glass-card p-5 rounded-lg text-center animate-fade-in-up"
                    style={{ animationDelay: `${0.1 * idx}s` }}
                  >
                    <div 
                      className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                    >
                      {step.icon}
                    </div>
                    <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected State - Credentials Display */}
          {walletAddress && (
            <div className="animate-fade-in-up">
              {/* Wallet Info Banner */}
              <div className="glass-card p-6 rounded-xl mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      My Credentials 🎓
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Credentials issued to wallet{" "}
                      <span className="font-mono" style={{ color: 'var(--primary)' }}>
                        {formatAddress(walletAddress)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchCredentialsFromBlockchain}
                      disabled={loading}
                      className="btn-secondary px-4 py-2 rounded-lg inline-flex items-center gap-2"
                    >
                      <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="glass-card p-4 rounded-lg mb-6" style={{ background: 'var(--error-subtle)', border: '1px solid rgba(184, 92, 92, 0.3)' }}>
                  <p className="text-sm" style={{ color: 'var(--error)' }}>⚠️ {error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="glass-card p-12 rounded-xl text-center">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <p style={{ color: 'var(--text-secondary)' }}>Fetching credentials from blockchain...</p>
                </div>
              )}

              {/* Credentials Grid */}
              {!loading && credentials.length > 0 && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="glass-card p-4 rounded-lg">
                      <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{credentials.length}</p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Credentials</p>
                    </div>
                    <div className="glass-card p-4 rounded-lg">
                      <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                        {credentials.filter(c => c.isValid && !c.isRevoked).length}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Valid</p>
                    </div>
                    <div className="glass-card p-4 rounded-lg">
                      <p className="text-2xl font-semibold" style={{ color: 'var(--warning)' }}>
                        {credentials.filter(c => !c.isInstitutionAuthorized && !c.isRevoked).length}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Institution Revoked</p>
                    </div>
                    <div className="glass-card p-4 rounded-lg">
                      <p className="text-2xl font-semibold" style={{ color: 'var(--error)' }}>
                        {credentials.filter(c => c.isRevoked).length}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Revoked</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {credentials.map((credential) => (
                      <CredentialCard key={credential.tokenId} credential={credential} />
                    ))}
                  </div>
                </>
              )}

              {/* Empty State */}
              {!loading && credentials.length === 0 && (
                <div className="glass-card p-12 rounded-xl text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    No Credentials Found
                  </h2>
                  <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    No blockchain credentials have been issued to this wallet address yet.
                    When an institution issues a credential to your wallet, it will appear here.
                  </p>
                  <Link 
                    href="/"
                    className="btn-secondary px-6 py-3 rounded-lg inline-block"
                  >
                    Verify Other Credentials
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 mt-12" style={{ borderTop: '1px solid var(--acrylic-border)' }}>
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></div>
              Connected to: {network.name} (Chain ID: {CHAIN_ID})
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-medium" style={{ color: 'var(--primary)' }}>VeriChain</span> - Blockchain is the source of truth
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
