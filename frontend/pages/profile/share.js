/**
 * VeriChain - Share Profile Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";

export default function ShareProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [shareSettings, setShareSettings] = useState({
    includeCredentials: true,
    includeProfile: true,
    expiresIn: "never",
    password: "",
  });
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/profile/share");
    }
  }, [loading, isAuthenticated, router]);

  const generateShareLink = () => {
    const linkId = Math.random().toString(36).substring(2, 10);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    setShareLink(`${baseUrl}/public/${user?.address?.slice(0, 8)}/${linkId}`);
  };

  const copyToClipboard = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        <title>Share Profile - VeriChain</title>
        <meta name="description" content="Share your VeriChain profile and credentials" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
          {/* Back Button */}
          <BackButton fallbackPath="/profile" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/profile" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Profile
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Share</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Share Your Profile</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Create a shareable link to your credentials for employers and verifiers
            </p>
          </div>

          {/* Share Options */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Share Options</h2>

            <div className="space-y-4">
              {/* Include Credentials */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/8 transition-normal">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Include Credentials</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Show all your verified credentials</p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer flex items-center ${
                    shareSettings.includeCredentials ? "bg-[var(--accent)]" : "bg-white/20"
                  }`}
                  onClick={() =>
                    setShareSettings({
                      ...shareSettings,
                      includeCredentials: !shareSettings.includeCredentials,
                    })
                  }
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      shareSettings.includeCredentials ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>

              {/* Include Profile */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/8 transition-normal">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Include Profile Info</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Show your name and bio</p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-all cursor-pointer flex items-center ${
                    shareSettings.includeProfile ? "bg-[var(--accent)]" : "bg-white/20"
                  }`}
                  onClick={() =>
                    setShareSettings({
                      ...shareSettings,
                      includeProfile: !shareSettings.includeProfile,
                    })
                  }
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      shareSettings.includeProfile ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>

              {/* Expiration */}
              <div className="p-3 rounded-lg bg-white/5">
                <label className="form-label mb-2">Link Expiration</label>
                <select
                  value={shareSettings.expiresIn}
                  onChange={(e) =>
                    setShareSettings({ ...shareSettings, expiresIn: e.target.value })
                  }
                  className="glass-input w-full"
                >
                  <option value="never">Never expires</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>

              {/* Password Protection */}
              <div className="p-3 rounded-lg bg-white/5">
                <label className="form-label mb-2">Password Protection (Optional)</label>
                <input
                  type="password"
                  value={shareSettings.password}
                  onChange={(e) =>
                    setShareSettings({ ...shareSettings, password: e.target.value })
                  }
                  placeholder="Leave empty for no password"
                  className="glass-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Generate Link */}
          <div className="glass-card rounded-lg p-6">
            {!shareLink ? (
              <div className="text-center">
                <div className="text-4xl mb-4">🔗</div>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Generate a unique link to share your profile
                </p>
                <button
                  onClick={generateShareLink}
                  className="btn-primary px-8 py-3 rounded-lg"
                >
                  Generate Share Link
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Your Share Link</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="glass-input flex-1 font-mono text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn-primary px-4 py-2 rounded-lg whitespace-nowrap"
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>

                {/* QR Code Placeholder */}
                <div className="bg-white/5 rounded-lg p-8 text-center mb-4">
                  <div 
                    className="w-32 h-32 mx-auto mb-4 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <span className="text-4xl">📱</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>QR Code (scan to view)</p>
                </div>

                {/* Share Buttons */}
                <div className="flex justify-center gap-4">
                  <button className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
                    <span>📧</span> Email
                  </button>
                  <button className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
                    <span>💼</span> LinkedIn
                  </button>
                  <button className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2">
                    <span>🐦</span> Twitter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="glass-card rounded-lg p-4 mt-6" style={{ border: '1px solid rgba(85, 88, 121, 0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>About Share Links</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Share links allow anyone to verify your credentials on-chain without needing
                  a VeriChain account. All verification is cryptographically proven.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
