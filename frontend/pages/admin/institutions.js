/**
 * VeriChain Admin - Manage Institutions Page
 * Windows 11 Fluent Design with real blockchain integration
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { ethers } from "ethers";
import { useAuth, ROLES } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";
import { 
  CONTRACT_ADDRESS, 
  CHAIN_ID, 
  getNetworkConfig,
  connectWallet,
  switchNetwork 
} from "../../utils/contract";

// Contract ABI for authorization functions
const AUTH_ABI = [
  "function authorizeInstitution(address institution)",
  "function revokeInstitution(address institution)",
  "function isAuthorizedInstitution(address institution) view returns (bool)",
  "function owner() view returns (address)",
  "event InstitutionAuthorized(address indexed institution, uint256 timestamp)",
  "event InstitutionRevoked(address indexed institution, uint256 timestamp)",
];

export default function ManageInstitutionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [newAddress, setNewAddress] = useState("");
  const [newName, setNewName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wallet, setWallet] = useState(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole(ROLES.ADMIN))) {
      router.push("/login?redirect=/admin/institutions");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  // Connect wallet on mount
  useEffect(() => {
    const initWallet = async () => {
      try {
        const walletData = await connectWallet();
        if (walletData.chainId !== CHAIN_ID) {
          await switchNetwork(CHAIN_ID);
        }
        setWallet(walletData);
      } catch (err) {
        console.error("Wallet connection error:", err);
      }
    };
    
    if (isAuthenticated) {
      initWallet();
    }
  }, [isAuthenticated]);

  // Load saved institutions from localStorage (for display names)
  useEffect(() => {
    const saved = localStorage.getItem("verichain_institutions");
    if (saved) {
      try {
        setInstitutions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load institutions:", e);
      }
    }
  }, []);

  // Save institutions to localStorage
  const saveInstitutions = (insts) => {
    setInstitutions(insts);
    localStorage.setItem("verichain_institutions", JSON.stringify(insts));
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    
    if (isProcessingRef.current || actionLoading) return;
    
    if (!newAddress || !newName) {
      setError("Please enter both address and name");
      return;
    }

    if (!ethers.isAddress(newAddress)) {
      setError("Invalid Ethereum address");
      return;
    }

    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    isProcessingRef.current = true;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      // Create contract instance with signer
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTH_ABI, wallet.signer);
      
      // Call authorizeInstitution on the smart contract
      setSuccess("Authorizing institution on blockchain...");
      const tx = await contract.authorizeInstitution(newAddress);
      
      setSuccess("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      // Add to local list
      const newInstitution = {
        address: newAddress,
        name: newName,
        issuedCount: 0,
        status: "active",
        addedAt: new Date().toISOString().split("T")[0],
        txHash: tx.hash,
      };

      saveInstitutions([...institutions, newInstitution]);
      setNewAddress("");
      setNewName("");
      setSuccess(`✅ Successfully authorized ${newName} on the blockchain!`);
    } catch (err) {
      console.error("Authorization error:", err);
      if (err.code === "ACTION_REJECTED") {
        setError("Transaction was rejected by user");
      } else if (err.reason) {
        setError(err.reason);
      } else {
        setError(err.message || "Failed to authorize institution");
      }
    } finally {
      setActionLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleRevoke = async (address) => {
    if (isProcessingRef.current || actionLoading) return;
    
    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    isProcessingRef.current = true;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTH_ABI, wallet.signer);
      
      setSuccess("Revoking institution authorization...");
      const tx = await contract.revokeInstitution(address);
      
      setSuccess("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      
      saveInstitutions(
        institutions.map((inst) =>
          inst.address.toLowerCase() === address.toLowerCase() 
            ? { ...inst, status: "revoked" } 
            : inst
        )
      );
      setSuccess("✅ Institution authorization revoked successfully!");
    } catch (err) {
      console.error("Revoke error:", err);
      if (err.code === "ACTION_REJECTED") {
        setError("Transaction was rejected by user");
      } else {
        setError(err.message || "Failed to revoke authorization");
      }
    } finally {
      setActionLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleReauthorize = async (address) => {
    if (isProcessingRef.current || actionLoading) return;
    
    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    isProcessingRef.current = true;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AUTH_ABI, wallet.signer);
      
      setSuccess("Reauthorizing institution...");
      const tx = await contract.authorizeInstitution(address);
      
      setSuccess("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      
      saveInstitutions(
        institutions.map((inst) =>
          inst.address.toLowerCase() === address.toLowerCase() 
            ? { ...inst, status: "active" } 
            : inst
        )
      );
      setSuccess("✅ Institution reauthorized successfully!");
    } catch (err) {
      console.error("Reauthorize error:", err);
      if (err.code === "ACTION_REJECTED") {
        setError("Transaction was rejected by user");
      } else {
        setError(err.message || "Failed to reauthorize");
      }
    } finally {
      setActionLoading(false);
      isProcessingRef.current = false;
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="glass-card p-8 rounded-lg">
          <div className="loading-spinner mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Manage Institutions - VeriChain Admin</title>
        <meta name="description" content="Manage authorized institutions" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <BackButton fallbackPath="/dashboard" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Manage Institutions</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Manage Institutions
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Authorize and manage credential-issuing institutions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="px-3 py-1.5 rounded-md text-sm font-medium"
                style={{ background: 'rgba(93, 138, 102, 0.15)', color: '#5d8a66', border: '1px solid rgba(93, 138, 102, 0.3)' }}
              >
                {institutions.filter((i) => i.status === "active").length} Active
              </span>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error mb-6 animate-shake">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success mb-6 animate-fade-in">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {/* Add New Institution */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Authorize New Institution
            </h2>
            <form onSubmit={handleAuthorize} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="form-label">Institution Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="University of Example"
                  className="glass-input w-full"
                />
              </div>
              <div className="flex-1">
                <label className="form-label">Wallet Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className="glass-input w-full font-mono text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary px-6 py-2.5 rounded-lg whitespace-nowrap"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="spinner"></div>
                      Processing...
                    </span>
                  ) : (
                    "Authorize"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Institutions List */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Authorized Institutions
              </h2>
            </div>
            <div>
              {institutions.length === 0 ? (
                <div className="px-6 py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  No institutions authorized yet
                </div>
              ) : (
                institutions.map((inst) => (
                  <div
                    key={inst.address}
                    className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/03 transition-normal"
                    style={{ borderBottom: '1px solid var(--acrylic-border)' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl">🏛️</span>
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{inst.name}</h3>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: inst.status === "active" ? 'rgba(93, 138, 102, 0.15)' : 'rgba(184, 92, 92, 0.15)',
                            color: inst.status === "active" ? '#5d8a66' : '#b85c5c',
                            border: inst.status === "active" ? '1px solid rgba(93, 138, 102, 0.3)' : '1px solid rgba(184, 92, 92, 0.3)'
                          }}
                        >
                          {inst.status}
                        </span>
                      </div>
                      <p className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {inst.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p style={{ color: 'var(--text-tertiary)' }}>Credentials</p>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{inst.issuedCount}</p>
                      </div>
                      <div className="text-center">
                        <p style={{ color: 'var(--text-tertiary)' }}>Added</p>
                        <p style={{ color: 'var(--text-primary)' }}>{inst.addedAt}</p>
                      </div>
                      <div>
                        {inst.status === "active" ? (
                          <button
                            onClick={() => handleRevoke(inst.address)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-md text-sm transition-normal"
                            style={{ background: 'rgba(184, 92, 92, 0.15)', color: '#b85c5c', border: '1px solid rgba(184, 92, 92, 0.3)' }}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReauthorize(inst.address)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-md text-sm transition-normal"
                            style={{ background: 'rgba(93, 138, 102, 0.15)', color: '#5d8a66', border: '1px solid rgba(93, 138, 102, 0.3)' }}
                          >
                            Reauthorize
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
