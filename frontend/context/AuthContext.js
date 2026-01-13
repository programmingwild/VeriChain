/**
 * VeriChain Authentication Context
 * Manages wallet-based authentication with role-based access
 * 
 * DEMO MODE: For hackathon judging - allows testing all features
 * without requiring blockchain authorization
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// User roles
export const ROLES = {
  ADMIN: "admin",
  INSTITUTION: "institution",
  HOLDER: "holder",
  GUEST: "guest",
};

// Auth context
const AuthContext = createContext(null);

// Local storage keys
const STORAGE_KEYS = {
  USER: "verichain_user",
  REMEMBER: "verichain_remember",
  DEMO_MODE: "verichain_demo_mode",
};

// Demo mode - for hackathon judging
const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  // Initialize from local storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for demo mode
        const storedDemoMode = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
        if (storedDemoMode === 'true' || DEMO_MODE_ENABLED) {
          setDemoMode(true);
        }

        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        if (stored) {
          const userData = JSON.parse(stored);
          
          // In demo mode, restore user without wallet check
          if (userData.isDemo) {
            setUser(userData);
            setLoading(false);
            return;
          }
          
          // Verify wallet is still connected
          if (window.ethereum) {
            const accounts = await window.ethereum.request({ 
              method: "eth_accounts" 
            });
            
            if (accounts.length > 0 && 
                accounts[0].toLowerCase() === userData.address.toLowerCase()) {
              setUser(userData);
            } else {
              // Wallet disconnected or changed
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          logout();
        } else {
          // Account changed, require re-login
          logout();
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  // Connect wallet and authenticate
  const login = useCallback(async (role, rememberMe = false) => {
    setError("");
    setLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to continue");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create authentication message
      const timestamp = Date.now();
      const message = [
        "🔐 VeriChain Authentication",
        "",
        `Role: ${role}`,
        `Address: ${address}`,
        `Timestamp: ${timestamp}`,
        "",
        "Sign this message to authenticate.",
      ].join("\n");

      // Request signature
      const signature = await signer.signMessage(message);

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Signature verification failed");
      }

      // Create user object
      const userData = {
        address,
        role,
        signature,
        timestamp,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      };

      setUser(userData);

      // Save to local storage if remember me
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.REMEMBER, "true");
      }

      return userData;
    } catch (err) {
      console.error("Login error:", err);
      
      if (err.code === 4001) {
        setError("You rejected the signature request");
      } else if (err.code === -32002) {
        setError("Please check MetaMask for pending request");
      } else {
        setError(err.message || "Login failed");
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER);
  }, []);

  // Enable/disable demo mode
  const toggleDemoMode = useCallback((enabled) => {
    setDemoMode(enabled);
    if (enabled) {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
      // If user is in demo mode, log them out
      if (user?.isDemo) {
        logout();
      }
    }
  }, [user, logout]);

  // Demo login - no wallet required
  const demoLogin = useCallback(async (role) => {
    setError("");
    setLoading(true);

    try {
      // Generate a demo address
      const demoAddresses = {
        admin: '0xDEMO000000000000000000000000000000ADMIN',
        institution: '0xDEMO00000000000000000000000000INSTITUTE',
        holder: '0xDEMO0000000000000000000000000000HOLDER',
      };

      const demoNames = {
        admin: '🎭 Demo Admin',
        institution: '🏫 Demo University',
        holder: '🎓 Demo Student',
      };

      const address = demoAddresses[role] || demoAddresses.holder;
      
      const userData = {
        address,
        role,
        isDemo: true,
        timestamp: Date.now(),
        displayName: demoNames[role] || 'Demo User',
      };

      setUser(userData);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      
      return userData;
    } catch (err) {
      console.error("Demo login error:", err);
      setError(err.message || "Demo login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((requiredRole) => {
    if (!user) return false;
    if (requiredRole === ROLES.GUEST) return true;
    if (user.role === ROLES.ADMIN) return true; // Admin has all roles
    return user.role === requiredRole;
  }, [user]);

  // Check if authenticated
  const isAuthenticated = !!user;
  
  // Computed role checks
  const isAdmin = user?.role === ROLES.ADMIN;
  const isInstitution = user?.role === ROLES.INSTITUTION || user?.role === ROLES.ADMIN;
  const isHolder = user?.role === ROLES.HOLDER;

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    isAuthenticated,
    isAdmin,
    isInstitution,
    isHolder,
    ROLES,
    // Demo mode
    demoMode,
    toggleDemoMode,
    demoLogin,
    isDemoUser: user?.isDemo || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protected routes
export function withAuth(Component, requiredRole = null) {
  return function ProtectedRoute(props) {
    const { user, loading, hasRole } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="glass-card p-8 rounded-2xl">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white mt-4">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-300">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export default AuthContext;
