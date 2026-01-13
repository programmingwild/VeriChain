/**
 * VeriChain - Institution Dashboard
 * Allows authorized institutions to issue credentials
 */

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  connectWallet,
  switchNetwork,
  checkInstitutionStatus,
  issueCredential,
  revokeCredential as revokeCredentialOnChain,
  getCredentialsByWallet,
  uploadMetadata,
  fetchMetadata,
  formatAddress,
  getExplorerUrl,
  getNetworkConfig,
  isMetaMaskInstalled,
  getEthereumProvider,
  CONTRACT_ADDRESS,
  CHAIN_ID,
  BACKEND_URL,
  clearCredentialCache,
} from "../utils/contract";
import Header from "../components/Header";
import BackButton from "../components/BackButton";

// Credential type presets
const CREDENTIAL_TYPES = [
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Certificate",
  "Professional License",
  "Course Completion",
  "Achievement Award",
  "Other",
];

export default function IssuePage() {
  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasMetaMask, setHasMetaMask] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    recipientWallet: "",
    recipientName: "",
    credentialType: "Certificate",
    credentialName: "",
    description: "",
    issuingInstitution: "",
    expirationDate: "",
    additionalData: "",
  });

  // Issued credentials
  const [issuedCredentials, setIssuedCredentials] = useState([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  // Contract address
  const [contractAddress, setContractAddress] = useState(CONTRACT_ADDRESS);
  const isProcessingRef = useRef(false); // Prevent double-clicks

  // Check for MetaMask on mount
  useEffect(() => {
    const checkMetaMask = () => {
      const installed = isMetaMaskInstalled();
      setHasMetaMask(installed);
      console.log("MetaMask installed:", installed);
    };
    
    // Check immediately and after a short delay (for slow loading)
    checkMetaMask();
    const timer = setTimeout(checkMetaMask, 1000);
    
    // Listen for account changes
    const ethereum = getEthereumProvider();
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          setWallet(null);
          setIsAuthorized(false);
        } else {
          handleConnect();
        }
      });
      
      ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Check authorization status when wallet connects
  useEffect(() => {
    if (wallet && contractAddress) {
      checkAuthorization();
    }
  }, [wallet, contractAddress]);

  const checkAuthorization = async () => {
    try {
      const status = await checkInstitutionStatus(wallet.address, contractAddress, CHAIN_ID);
      if (status.success) {
        setIsAuthorized(status.isAuthorized);
        setIsOwner(status.isOwner);
      }
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Attempting to connect wallet...");
      const walletData = await connectWallet();
      console.log("Connected:", walletData);
      
      // Check if on correct network
      if (walletData.chainId !== CHAIN_ID) {
        console.log(`Wrong network. Expected ${CHAIN_ID}, got ${walletData.chainId}`);
        setSuccess(`Switching to ${getNetworkConfig(CHAIN_ID).name}...`);
        
        try {
          await switchNetwork(CHAIN_ID);
          // Reconnect after network switch
          const updatedWallet = await connectWallet();
          setWallet(updatedWallet);
          setSuccess("");
        } catch (switchErr) {
          console.error("Network switch failed:", switchErr);
          // Still set the wallet even if network switch fails
          setWallet(walletData);
          setError(`Connected but on wrong network. Please switch to ${getNetworkConfig(CHAIN_ID).name} (Chain ID: ${CHAIN_ID}) manually.`);
        }
      } else {
        setWallet(walletData);
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueCredential = async (e) => {
    e.preventDefault();
    
    // Prevent double-clicks
    if (isProcessingRef.current || loading) return;
    
    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    if (!isAuthorized) {
      setError("Your wallet is not authorized to issue credentials");
      return;
    }

    if (!contractAddress) {
      setError("Contract address not configured");
      return;
    }

    // Validate recipient wallet
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipientWallet)) {
      setError("Invalid recipient wallet address");
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Upload metadata to IPFS
      setSuccess("Uploading metadata to IPFS...");
      
      const metadataPayload = {
        name: formData.credentialName || `${formData.credentialType} - ${formData.recipientName}`,
        description: formData.description || `${formData.credentialType} issued by ${formData.issuingInstitution}`,
        credentialType: formData.credentialType,
        issuingInstitution: formData.issuingInstitution,
        institutionWallet: wallet.address,
        recipientWallet: formData.recipientWallet,
        recipientName: formData.recipientName,
        issueDate: new Date().toISOString(),
        expirationDate: formData.expirationDate || null,
        additionalData: formData.additionalData ? JSON.parse(formData.additionalData) : {},
      };

      const ipfsResult = await uploadMetadata(metadataPayload);
      
      if (!ipfsResult.success) {
        throw new Error(ipfsResult.error || "Failed to upload metadata to IPFS");
      }

      // Step 2: Issue credential on-chain
      setSuccess("Issuing credential on blockchain...");
      
      const issueResult = await issueCredential(
        wallet.signer,
        formData.recipientWallet,
        ipfsResult.ipfsUri,
        contractAddress
      );

      if (!issueResult.success) {
        throw new Error(issueResult.error || "Failed to issue credential");
      }

      // Success!
      const explorerUrl = getExplorerUrl(issueResult.transactionHash, CHAIN_ID);
      setSuccess(
        `✅ Credential issued successfully! Token ID: ${issueResult.tokenId}. ` +
        (explorerUrl ? `View on explorer: ${explorerUrl}` : "")
      );

      // Clear cache so the new credential shows immediately
      clearCredentialCache();

      // Reset form
      setFormData({
        recipientWallet: "",
        recipientName: "",
        credentialType: "Certificate",
        credentialName: "",
        description: "",
        issuingInstitution: formData.issuingInstitution, // Keep institution
        expirationDate: "",
        additionalData: "",
      });

      // Refresh credentials list
      loadIssuedCredentials();

    } catch (err) {
      console.error("Issue error:", err);
      setError(err.message);
      setSuccess("");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const loadIssuedCredentials = async () => {
    if (!wallet || !contractAddress) return;

    setLoadingCredentials(true);
    try {
      // This is a simplified approach - in production you'd query events
      // For demo, we'll show a message that credentials can be viewed on verify page
      setLoadingCredentials(false);
    } catch (err) {
      console.error("Load credentials error:", err);
      setLoadingCredentials(false);
    }
  };

  const network = getNetworkConfig(CHAIN_ID);

  return (
    <>
      <Head>
        <title>VeriChain - Issue Credentials</title>
        <meta name="description" content="Issue blockchain credentials" />
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

          {/* Header */}
          <div className="text-center mb-12 animate-fade-in-down">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-gradient">Institution Dashboard</span>
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Issue soulbound credentials to students and recipients
            </p>
          </div>

          {/* Wallet Connection Card */}
          <div className="glass-card rounded-3xl p-6 mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Wallet Connection</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {wallet
                    ? `Connected: ${formatAddress(wallet.address)}`
                    : "Connect your institution wallet to issue credentials"}
                </p>
              </div>

              {!wallet ? (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={loading || !hasMetaMask}
                    className="btn-primary px-6 py-3"
                  >
                    {loading ? "Connecting..." : hasMetaMask ? "Connect Wallet" : "MetaMask Required"}
                  </button>
                  {!hasMetaMask && (
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Install MetaMask →
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {isOwner && (
                    <span className="credential-badge" style={{ background: "rgba(147, 51, 234, 0.2)", borderColor: "rgba(147, 51, 234, 0.3)", color: "#a855f7" }}>
                      ⚡ Contract Owner
                    </span>
                  )}
                  {isAuthorized ? (
                    <span className="credential-badge">
                      ✓ Authorized Institution
                    </span>
                  ) : (
                    <span className="credential-badge revoked">
                      ✗ Not Authorized
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Connection Error */}
            {error && !wallet && (
              <div className="mt-4 alert alert-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Network Info */}
            {wallet && (
              <div className="mt-4 pt-4 text-sm flex items-center gap-2" style={{ borderTop: '1px solid var(--acrylic-border)', color: 'var(--text-tertiary)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }}></div>
                Network: {network.name} (Chain ID: {CHAIN_ID})
              </div>
            )}

            {/* Contract Address */}
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                Contract Configuration
              </summary>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Contract address"
                className="glass-input mt-2"
              />
            </details>
          </div>

          {/* Not Authorized Message */}
          {wallet && !isAuthorized && (
            <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-up" style={{ borderLeft: '4px solid var(--warning)', background: 'var(--warning-subtle)' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                ⚠️ Institution Not Authorized
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Your wallet ({formatAddress(wallet.address)}) is not authorized to issue credentials.
                Contact the contract owner to get your institution authorized.
              </p>
            </div>
          )}

          {/* Issue Credential Form */}
          {wallet && isAuthorized && (
            <div className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(85, 88, 121, 0.15)', border: '1px solid rgba(85, 88, 121, 0.3)' }}>
                  📜
                </span>
                Issue New Credential
              </h2>

              {error && (
                <div className="alert alert-error mb-6 animate-shake">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success mb-6">
                  <span>✅</span>
                  <span className="break-all">{success}</span>
                </div>
              )}

              <form onSubmit={handleIssueCredential} className="space-y-6">
                {/* Recipient Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="form-label">
                      Recipient Wallet Address *
                    </label>
                    <input
                      type="text"
                      name="recipientWallet"
                      value={formData.recipientWallet}
                      onChange={handleInputChange}
                      placeholder="0x..."
                      required
                      className="glass-input"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="glass-input"
                    />
                  </div>
                </div>

                {/* Credential Type */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="form-label">
                      Credential Type *
                    </label>
                    <select
                      name="credentialType"
                      value={formData.credentialType}
                      onChange={handleInputChange}
                      required
                      className="glass-select"
                    >
                      {CREDENTIAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">
                      Credential Name *
                    </label>
                    <input
                      type="text"
                      name="credentialName"
                      value={formData.credentialName}
                      onChange={handleInputChange}
                      placeholder="e.g., Bachelor of Computer Science"
                      required
                      className="glass-input"
                    />
                  </div>
                </div>

                {/* Institution */}
                <div className="form-group mb-0">
                  <label className="form-label">
                    Issuing Institution *
                  </label>
                  <input
                    type="text"
                    name="issuingInstitution"
                    value={formData.issuingInstitution}
                    onChange={handleInputChange}
                    placeholder="e.g., University of Technology"
                    required
                    className="glass-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group mb-0">
                  <label className="form-label">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Additional details about this credential..."
                    rows={3}
                    className="glass-input resize-none"
                  />
                </div>

                {/* Expiration Date */}
                <div className="form-group mb-0">
                  <label className="form-label">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleInputChange}
                    className="glass-input"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 text-lg"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span className="ml-2">Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Issue Credential
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Instructions */}
          {!wallet && (
            <div className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(85, 88, 121, 0.15)', border: '1px solid rgba(85, 88, 121, 0.3)' }}>
                  🚀
                </span>
                Getting Started
              </h2>
              <ol className="list-decimal list-inside space-y-3" style={{ color: 'var(--text-secondary)' }}>
                <li>Connect your MetaMask wallet</li>
                <li>Ensure your wallet is authorized by the contract owner</li>
                <li>Fill in the credential details</li>
                <li>Click "Issue Credential" to mint a soulbound NFT</li>
              </ol>
              <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--acrylic-border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> Credentials are soulbound (non-transferable) and stored permanently on the blockchain.
                  Make sure all information is correct before issuing.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
