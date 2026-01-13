/**
 * VeriChain Header Component
 * Glassmorphism navigation header with auth integration
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth, ROLES } from "../context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout, hasRole, isDemoUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isActive = (path) => router.pathname === path;

  // Role-based navigation links
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { href: "/login", label: "Login", icon: "🔐" },
      ];
    }

    // Admin navigation
    if (hasRole(ROLES.ADMIN)) {
      return [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/issue", label: "Issue", icon: "📜" },
        { href: "/verify", label: "Verify", icon: "✅" },
        { href: "/admin/institutions", label: "Institutions", icon: "🏛️" },
        { href: "/admin/analytics", label: "Analytics", icon: "📈" },
      ];
    }

    // Institution navigation
    if (hasRole(ROLES.INSTITUTION)) {
      return [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/issue", label: "Issue Credential", icon: "📜" },
        { href: "/issue-hybrid", label: "Issue Hybrid (Inco FHE)", icon: "🔐" },
        { href: "/credentials/issued", label: "Issued", icon: "📋" },
        { href: "/verify", label: "Verify", icon: "✅" },
      ];
    }

    // Holder navigation (default)
    return [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/holder", label: "My Credentials", icon: "🎓" },
      { href: "/verify", label: "Verify", icon: "✅" },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="glass-card sticky top-0 z-50" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-normal"
              style={{ background: 'var(--primary)' }}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>VeriChain</span>
            <span 
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ 
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                color: 'white',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.3)'
              }}
            >
              ⚡ Shardeum
            </span>
            {/* Demo Mode Badge */}
            {isDemoUser && (
              <span 
                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium animate-pulse"
                style={{ 
                  background: 'linear-gradient(135deg, #c4a35a 0%, #ffc857 100%)', 
                  color: '#1a1a2e',
                  boxShadow: '0 1px 2px rgba(196, 163, 90, 0.3)'
                }}
              >
                🎭 DEMO
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link flex items-center gap-2 text-sm ${
                  isActive(link.href) ? "active" : ""
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-3 glass-card px-3 py-1.5 rounded-lg transition-normal"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div 
                    className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                    style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                  >
                    {user?.role === ROLES.INSTITUTION ? "🏛️" : user?.role === ROLES.ADMIN ? "⚙️" : "🎓"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{user?.role}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-normal ${profileMenuOpen ? "rotate-180" : ""}`}
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 glass-card rounded-lg p-1.5 animate-fade-in-down" style={{ border: '1px solid var(--acrylic-border)', background: 'var(--bg-elevated)' }}>
                    <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {user?.address?.slice(0, 8)}...{user?.address?.slice(-6)}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-normal text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>📊</span>
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-normal text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>👤</span>
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-normal text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                    </Link>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--acrylic-border)', margin: '6px 0' }} />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-normal text-sm"
                      style={{ color: 'var(--error)' }}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="btn-secondary px-4 py-2 rounded-lg text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary px-4 py-2 rounded-lg text-sm hidden sm:inline-flex"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md transition-normal"
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 animate-fade-in-down" style={{ borderTop: '1px solid var(--acrylic-border)' }}>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link flex items-center gap-3 py-2.5 text-sm ${
                    isActive(link.href) ? "active" : ""
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
