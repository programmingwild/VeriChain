/**
 * VeriChain - Verification Page
 * Glassmorphism design for credential verification
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  verifyCredential,
  getCredentialsByWallet,
  fetchMetadata,
  formatAddress,
  getNetworkConfig,
  CONTRACT_ADDRESS,
  CHAIN_ID,
} from "../utils/contract";
import Header from "../components/Header";
import CredentialCard from "../components/CredentialCard";
import BackButton from "../components/BackButton";

export default function VerifyPage() {
  const router = useRouter();
  const [searchType, setSearchType] = useState("wallet"); // 'wallet' or 'tokenId'
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [contractAddress, setContractAddress] = useState(CONTRACT_ADDRESS);
  const isProcessingRef = useRef(false); // Prevent double-clicks

  // Handle URL query params for direct verification links
  useEffect(() => {
    const { tokenId, wallet, contract } = router.query;
    
    if (contract) {
      setContractAddress(contract);
    }
    
    if (tokenId) {
      setSearchType("tokenId");
      setSearchInput(tokenId);
      handleSearch(null, "tokenId", tokenId, contract || CONTRACT_ADDRESS);
    } else if (wallet) {
      setSearchType("wallet");
      setSearchInput(wallet);
      handleSearch(null, "wallet", wallet, contract || CONTRACT_ADDRESS);
    }
  }, [router.query]);

  const handleSearch = async (e, type = searchType, input = searchInput, contract = contractAddress) => {
    if (e) e.preventDefault();
    
    // Prevent double-clicks
    if (isProcessingRef.current || loading) return;
    
    if (!input.trim()) {
      setError("Please enter a wallet address or token ID");
      return;
    }

    if (!contract) {
      setError("Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS.");
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      if (type === "wallet") {
        // Validate wallet address
        if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
          throw new Error("Invalid wallet address format");
        }

        const result = await getCredentialsByWallet(input, contract, CHAIN_ID);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        // Fetch metadata for each credential in parallel
        const credentialsWithMetadata = await Promise.all(
          result.credentials.map(async (cred) => {
            const metadataResult = await fetchMetadata(cred.tokenURI);
            return {
              ...cred,
              metadata: metadataResult.success ? metadataResult.metadata : null,
            };
          })
        );

        setResults({
          type: "wallet",
          wallet: input,
          credentials: credentialsWithMetadata,
          count: credentialsWithMetadata.length,
        });
      } else {
        // Token ID search
        const tokenId = parseInt(input);
        if (isNaN(tokenId) || tokenId < 0) {
          throw new Error("Invalid token ID");
        }

        const result = await verifyCredential(tokenId, contract, CHAIN_ID);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        // Fetch metadata
        const metadataResult = await fetchMetadata(result.tokenURI);
        
        setResults({
          type: "tokenId",
          credential: {
            ...result,
            metadata: metadataResult.success ? metadataResult.metadata : null,
          },
        });
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Failed to verify credential");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const network = getNetworkConfig(CHAIN_ID);

  return (
    <>
      <Head>
        <title>VeriChain - Verify Credentials</title>
        <meta name="description" content="Verify blockchain credentials instantly" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          {/* Back Button */}
          <div className="mb-6">
            <BackButton fallbackPath="/dashboard" />
          </div>

          {/* Hero Section */}
          <div className="text-center mb-10 animate-fade-in-down">
            <h1 className="text-3xl md:text-4xl font-semibold mb-4">
              <span className="text-gradient">Verify Credentials</span>
            </h1>
            <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Instantly verify blockchain credentials without intermediaries.
              Enter a wallet address or token ID to check credential authenticity.
            </p>
          </div>

          {/* Search Form */}
          <div className="glass-card rounded-lg p-6 md:p-8 mb-8 animate-fade-in-up">
            {/* Search Type Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--acrylic-border)' }}>
                <button
                  onClick={() => setSearchType("wallet")}
                  className="px-5 py-2 rounded-md text-sm font-medium transition-normal"
                  style={{ 
                    background: searchType === "wallet" ? 'var(--primary)' : 'transparent', 
                    color: searchType === "wallet" ? 'white' : 'var(--text-secondary)' 
                  }}
                >
                  By Wallet Address
                </button>
                <button
                  onClick={() => setSearchType("tokenId")}
                  className="px-5 py-2 rounded-md text-sm font-medium transition-normal"
                  style={{ 
                    background: searchType === "tokenId" ? 'var(--primary)' : 'transparent', 
                    color: searchType === "tokenId" ? 'white' : 'var(--text-secondary)' 
                  }}
                >
                  By Token ID
                </button>
              </div>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="form-label">
                  {searchType === "wallet" ? "Wallet Address" : "Token ID"}
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    searchType === "wallet"
                      ? "0x..."
                      : "Enter token ID (e.g., 0, 1, 2...)"
                  }
                  className="glass-input"
                />
              </div>

              {/* Contract Address (collapsible) */}
              <details className="text-sm">
                <summary className="cursor-pointer transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  Advanced: Contract Address
                </summary>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="Contract address (optional)"
                  className="glass-input mt-2 text-sm"
                />
              </details>

              {error && (
                <div className="alert alert-error animate-shake">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-lg"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span className="ml-2">Verifying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify Credential
                  </>
                )}
              </button>
            </form>

            {/* Network Info */}
            <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span className="inline-flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></div>
                Connected to: {network.name} (Chain ID: {CHAIN_ID})
              </span>
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <div className="space-y-4 animate-fade-in-up">
              {results.type === "wallet" ? (
                <>
                  <div className="flex items-center justify-between glass-card rounded-lg p-4">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Credentials for {formatAddress(results.wallet)}
                    </h2>
                    <span 
                      className="px-3 py-1.5 rounded-md text-sm font-medium"
                      style={{ background: 'rgba(85, 88, 121, 0.1)', color: 'var(--primary)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                    >
                      {results.count} credential{results.count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {results.count === 0 ? (
                    <div className="glass-card rounded-lg p-8 text-center">
                      <svg className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p style={{ color: 'var(--text-tertiary)' }}>No credentials found for this wallet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {results.credentials.map((cred) => (
                        <CredentialCard key={cred.tokenId} credential={cred} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <CredentialCard credential={results.credential} expanded />
              )}
            </div>
          )}

          {/* How It Works */}
          {!results && (
            <div className="mt-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-xl font-semibold text-center mb-6" style={{ color: 'var(--text-primary)' }}>How It Works</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-card rounded-lg p-5 text-center transition-normal">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 text-xl"
                    style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                  >
                    🔍
                  </div>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>1. Enter Address</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Input a wallet address or token ID to look up credentials
                  </p>
                </div>
                <div className="glass-card rounded-lg p-5 text-center transition-normal">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 text-xl"
                    style={{ background: 'rgba(196, 163, 90, 0.1)', border: '1px solid rgba(196, 163, 90, 0.25)' }}
                  >
                    ⛓️
                  </div>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>2. On-Chain Verification</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Data is fetched directly from the blockchain - no intermediaries
                  </p>
                </div>
                <div className="glass-card rounded-lg p-5 text-center transition-normal">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 text-xl"
                    style={{ background: 'rgba(93, 138, 102, 0.1)', border: '1px solid rgba(93, 138, 102, 0.25)' }}
                  >
                    ✅
                  </div>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>3. Instant Results</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    See credential status, issuer details, and metadata instantly
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 mt-12" style={{ borderTop: '1px solid var(--acrylic-border)' }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <p className="font-medium" style={{ color: 'var(--primary)' }}>VeriChain - Decentralized Proof-of-Achievement</p>
            <p className="mt-1">Blockchain is the source of truth.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
