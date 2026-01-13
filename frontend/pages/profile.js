/**
 * VeriChain - Profile Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../context/AuthContext";
import Header from "../components/Header";
import BackButton from "../components/BackButton";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    bio: "",
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    // Load profile from localStorage
    const savedProfile = localStorage.getItem("verichain_profile");
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      setFormData({
        displayName: parsed.displayName || user?.displayName || "",
        email: parsed.email || "",
        bio: parsed.bio || "",
      });
    } else if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: "",
        bio: "",
      });
    }
  }, [user]);

  const handleSave = () => {
    const updatedProfile = {
      ...profile,
      ...formData,
    };
    localStorage.setItem("verichain_profile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
    setEditing(false);
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
        <title>Profile - VeriChain</title>
        <meta name="description" content="Your VeriChain profile" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-3xl mx-auto px-4 py-8">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton fallbackPath="/dashboard" />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Profile</span>
          </div>

          {/* Profile Card */}
          <div className="glass-card rounded-lg overflow-hidden">
            {/* Header */}
            <div 
              className="h-24"
              style={{ background: 'linear-gradient(135deg, rgba(96, 205, 255, 0.2) 0%, rgba(96, 205, 255, 0.05) 100%)' }}
            />
            
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="flex items-end gap-4 -mt-10 mb-6">
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl border-4"
                  style={{ 
                    background: 'var(--bg-primary)', 
                    borderColor: 'var(--bg-primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  {user?.role === ROLES.INSTITUTION ? "🏛️" : user?.role === ROLES.ADMIN ? "👑" : "🎓"}
                </div>
                <div className="flex-1 pb-1">
                  <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formData.displayName || user?.displayName || "Anonymous"}
                  </h1>
                  <p className="capitalize" style={{ color: 'var(--text-secondary)' }}>{user?.role}</p>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-secondary px-4 py-2 rounded-lg text-sm"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="form-label">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="glass-input w-full resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="btn-primary px-6 py-2 rounded-lg"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="btn-secondary px-6 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Wallet Address</p>
                      <p className="font-mono text-sm break-all" style={{ color: 'var(--text-primary)' }}>{user?.address}</p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Email</p>
                      <p style={{ color: 'var(--text-primary)' }}>{formData.email || "Not set"}</p>
                    </div>
                  </div>
                  {formData.bio && (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Bio</p>
                      <p style={{ color: 'var(--text-primary)' }}>{formData.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="glass-card p-4 rounded-lg text-center">
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>0</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Credentials</p>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>0</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Verifications</p>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Active</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Status</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-lg p-6 mt-6 border border-red-500/20">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Disconnect your wallet and clear local session data.
            </p>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-normal text-sm"
            >
              Disconnect Wallet
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
