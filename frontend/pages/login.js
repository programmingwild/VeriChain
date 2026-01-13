/**
 * VeriChain Login Page
 * Glassmorphism design with wallet-based authentication
 * 
 * DEMO MODE: Allows hackathon judges to test all features
 * without requiring blockchain authorization
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../context/AuthContext";
import { checkInstitutionStatus, CONTRACT_ADDRESS, CHAIN_ID } from "../utils/contract";

export default function LoginPage() {
  const router = useRouter();
  const { 
    login, 
    isAuthenticated, 
    loading: authLoading, 
    error: authError, 
    user,
    demoMode,
    toggleDemoMode,
    demoLogin
  } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [walletStatus, setWalletStatus] = useState(null); // Track wallet permissions
  const [checkingWallet, setCheckingWallet] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check wallet permissions when user connects (only in non-demo mode)
  const checkWalletPermissions = async () => {
    // Skip wallet check in demo mode
    if (demoMode) return;
    if (!window.ethereum) return;
    
    try {
      setCheckingWallet(true);
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        const status = await checkInstitutionStatus(address, CONTRACT_ADDRESS, CHAIN_ID);
        
        if (status.success) {
          setWalletStatus({
            address,
            isOwner: status.isOwner,
            isInstitution: status.isAuthorized,
          });
          
          // Auto-select appropriate role
          if (status.isOwner) {
            setSelectedRole(ROLES.ADMIN);
          } else if (status.isAuthorized) {
            setSelectedRole(ROLES.INSTITUTION);
          } else {
            setSelectedRole(ROLES.HOLDER);
          }
        }
      }
    } catch (err) {
      console.error("Error checking wallet:", err);
    } finally {
      setCheckingWallet(false);
    }
  };

  useEffect(() => {
    // In demo mode, don't check wallet - just allow all roles
    if (demoMode) {
      setWalletStatus(null);
      return;
    }
    
    if (mounted && window.ethereum) {
      checkWalletPermissions();
      
      // Listen for account changes
      window.ethereum.on("accountsChanged", checkWalletPermissions);
      return () => window.ethereum.removeListener("accountsChanged", checkWalletPermissions);
    }
  }, [mounted, demoMode]);

  // Redirect based on role
  const getRedirectPath = (role) => {
    if (router.query.redirect) return router.query.redirect;
    
    switch (role) {
      case ROLES.ADMIN:
        return "/dashboard";
      case ROLES.INSTITUTION:
        return "/dashboard";
      case ROLES.HOLDER:
        return "/holder";
      default:
        return "/dashboard";
    }
  };

  useEffect(() => {
    if (isAuthenticated && mounted && user?.role) {
      const redirect = router.query.redirect || (user.role === ROLES.HOLDER ? "/holder" : "/dashboard");
      router.push(redirect);
    }
  }, [isAuthenticated, mounted, user?.role, router.query.redirect]);

  const handleLogin = async () => {
    if (!selectedRole) {
      setError("Please select your role");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use demo login if demo mode is active
      if (demoMode) {
        await demoLogin(selectedRole);
      } else {
        await login(selectedRole, rememberMe);
      }
      const redirect = getRedirectPath(selectedRole);
      router.push(redirect);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // In demo mode, all roles are available
  const roles = [
    {
      id: ROLES.ADMIN,
      title: "Administrator",
      description: "Manage institutions and system settings",
      icon: "👑",
      color: "#555879",
      available: demoMode || walletStatus?.isOwner || false,
      unavailableReason: demoMode ? null : "Only the contract owner can access admin features",
    },
    {
      id: ROLES.INSTITUTION,
      title: "Institution",
      description: "Issue and manage credentials",
      icon: "🏛️",
      color: "#98A1BC",
      available: demoMode || walletStatus?.isInstitution || walletStatus?.isOwner || false,
      unavailableReason: demoMode ? null : "Your wallet is not authorized as an institution. Contact the admin to get authorized.",
    },
    {
      id: ROLES.HOLDER,
      title: "Credential Holder",
      description: "View and share your credentials",
      icon: "🎓",
      color: "#5D8A66",
      available: true, // Everyone can be a holder
      unavailableReason: null,
    },
  ];

  if (authLoading) {
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
        <title>Login - VeriChain</title>
        <meta name="description" content="Login to VeriChain" />
      </Head>

      <div className="min-h-screen animated-bg overflow-hidden">
        {/* Floating orbs background */}
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo */}
          <div className="mb-8 text-center animate-fade-in-down">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>VeriChain</span>
            </Link>
          </div>

          {/* Login Card */}
          <div className="glass-card w-full max-w-lg p-8 rounded-lg animate-fade-in-up">
            {/* Demo Mode Banner */}
            {demoMode && (
              <div 
                className="mb-6 p-4 rounded-lg border-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(196,163,90,0.15), rgba(255,200,87,0.1))',
                  borderColor: '#c4a35a',
                  color: '#2D2E3A' // Ensures text is visible on light backgrounds
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">🎭</span>
                  <span className="font-bold" style={{ color: '#c4a35a' }}>DEMO MODE ACTIVE</span>
                </div>
                <p className="text-sm text-center" style={{ color: '#2D2E3A', fontWeight: 500 }}>
                  All features unlocked for hackathon judging. No wallet required!
                </p>
                {/* Important Notice */}
                <div 
                  className="mt-3 p-3 rounded-lg text-left"
                  style={{ background: 'rgba(255,255,255,0.85)', color: '#2D2E3A' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: '#c4a35a' }}>
                    ⚠️ Important Note for Judges:
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: '#2D2E3A' }}>
                    <li>• <strong>Real blockchain integration works!</strong> The smart contract is deployed on Shardeum Testnet.</li>
                    <li>• The authorized MetaMask wallet (contract owner) is with the developer.</li>
                    <li>• Demo Mode simulates transactions so you can test all features without needing the authorized wallet.</li>
                    <li>• Inco FHE encryption is demonstrated in simulation mode.</li>
                  </ul>
                  <div className="mt-2 p-2 rounded bg-yellow-100 border border-yellow-300" style={{ color: '#7A5A00', fontWeight: 500 }}>
                    <span>👉 <b>If you need to test the real wallet:</b> Disable demo mode and create an account as <b>Institution</b>. The developer will authorize your wallet so you can test with real blockchain integration.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome Back</h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {demoMode ? "Select any role to explore" : "Connect your wallet to continue"}
              </p>
            </div>

            {/* Error Message */}
            {(error || authError) && (
              <div className="alert alert-error mb-6 animate-shake">
                <span>⚠️</span>
                <p className="text-sm">{error || authError}</p>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-4 mb-8">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Select your role:
                {!demoMode && checkingWallet && <span className="ml-2 text-xs">(checking wallet...)</span>}
              </p>
              
              {/* Wallet Status Info - Only show when NOT in demo mode */}
              {!demoMode && walletStatus && (
                <div className="glass-card p-3 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Connected: <span className="font-mono">{walletStatus.address.slice(0, 8)}...{walletStatus.address.slice(-6)}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Status: {walletStatus.isOwner ? "👑 Contract Owner" : walletStatus.isInstitution ? "🏛️ Authorized Institution" : "🎓 Credential Holder"}
                  </p>
                </div>
              )}
              
              <div className="grid gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => role.available && setSelectedRole(role.id)}
                    disabled={!role.available}
                    className={`glass-card p-4 rounded-lg text-left transition-normal ${
                      selectedRole === role.id
                        ? "ring-2"
                        : ""
                    } ${!role.available ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ 
                      ringColor: selectedRole === role.id ? role.color : 'transparent',
                      borderColor: selectedRole === role.id ? role.color : 'var(--acrylic-border)',
                      background: selectedRole === role.id ? 'var(--bg-elevated)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-xl"
                        style={{ background: `${role.color}15`, border: `1px solid ${role.color}40` }}
                      >
                        {role.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{role.title}</h3>
                          {role.available && role.id !== ROLES.HOLDER && (
                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--success)', color: 'white' }}>
                              ✓ Available
                            </span>
                          )}
                          {!role.available && (
                            <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--warning)', color: 'white' }}>
                              🔒 Locked
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          {!role.available ? role.unavailableReason : role.description}
                        </p>
                      </div>
                      <div 
                        className="w-5 h-5 rounded-full border-2 transition-normal flex items-center justify-center"
                        style={{ 
                          background: selectedRole === role.id ? 'var(--primary)' : 'transparent',
                          borderColor: selectedRole === role.id ? 'var(--primary)' : 'var(--secondary)'
                        }}
                      >
                        {selectedRole === role.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setRememberMe(!rememberMe)}
                className="w-5 h-5 rounded border-2 transition-normal flex items-center justify-center"
                style={{ 
                  background: rememberMe ? 'var(--primary)' : 'transparent',
                  borderColor: rememberMe ? 'var(--primary)' : 'var(--secondary)'
                }}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remember me</span>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading || !selectedRole}
              className="w-full btn-primary py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="spinner"></div>
                  {demoMode ? "Entering Demo..." : "Connecting..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {demoMode ? (
                    <>
                      <span>🎭</span>
                      Enter Demo Mode
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Connect Wallet
                    </>
                  )}
                </span>
              )}
            </button>

            {/* Demo Mode Toggle */}
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎭</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Demo Mode
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      For hackathon judges
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleDemoMode(!demoMode)}
                  className="relative w-12 h-6 rounded-full transition-all duration-200"
                  style={{ 
                    background: demoMode ? '#c4a35a' : 'var(--secondary)'
                  }}
                >
                  <div 
                    className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200"
                    style={{ left: demoMode ? '28px' : '4px' }}
                  />
                </button>
              </div>
              
              {/* Demo Info */}
              <button
                onClick={() => setShowDemoInfo(!showDemoInfo)}
                className="text-xs mt-2 underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {showDemoInfo ? "Hide info" : "What is Demo Mode?"}
              </button>
              
              {showDemoInfo && (
                <div className="mt-3 p-3 rounded text-xs space-y-2" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                  <p><strong>Demo Mode</strong> allows anyone to test VeriChain without a crypto wallet:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>👑 Admin:</strong> Authorize institutions, view all credentials</li>
                    <li><strong>🏛️ Institution:</strong> Issue credentials with Inco FHE encryption</li>
                    <li><strong>🎓 Holder:</strong> View and verify credentials</li>
                  </ul>
                  <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                    Demo transactions are simulated. Connect a real wallet for blockchain interactions.
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--acrylic-border)' }}></div>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--acrylic-border)' }}></div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
              New to VeriChain?{" "}
              <Link href="/signup" className="font-medium transition-normal" style={{ color: 'var(--primary)' }}>
                Create an account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm animate-fade-in" style={{ color: 'var(--text-tertiary)' }}>
            <p>By connecting, you agree to our Terms of Service</p>
          </div>
        </div>
      </div>
    </>
  );
}
