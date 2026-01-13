/**
 * VeriChain Dashboard Page
 * Role-based dashboard with glassmorphism design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../context/AuthContext";
import Header from "../components/Header";
import BackButton from "../components/BackButton";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, hasRole } = useAuth();
  const [stats, setStats] = useState({
    credentials: 0,
    issued: 0,
    verified: 0,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="glass-card p-8 rounded-lg">
          <div className="loading-spinner mx-auto"></div>
        </div>
      </div>
    );
  }

  const quickActions = {
    [ROLES.ADMIN]: [
      { title: "Manage Institutions", icon: "🏛️", href: "/admin/institutions", color: "#555879" },
      { title: "System Settings", icon: "⚙️", href: "/admin/settings", color: "#98A1BC" },
      { title: "View Analytics", icon: "📊", href: "/admin/analytics", color: "#5D8A66" },
      { title: "Issue Credentials", icon: "📜", href: "/issue", color: "#C4A35A" },
    ],
    [ROLES.INSTITUTION]: [
      { title: "Issue Credential", icon: "📜", href: "/issue", color: "#555879" },
      { title: "View Issued", icon: "📋", href: "/credentials/issued", color: "#5D8A66" },
      { title: "Batch Issue", icon: "📦", href: "/issue/batch", color: "#C4A35A" },
      { title: "Institution Profile", icon: "🏛️", href: "/profile", color: "#98A1BC" },
    ],
    [ROLES.HOLDER]: [
      { title: "My Credentials", icon: "🎓", href: "/credentials", color: "#555879" },
      { title: "Verify Credential", icon: "✅", href: "/", color: "#5D8A66" },
      { title: "Share Profile", icon: "🔗", href: "/profile/share", color: "#C4A35A" },
      { title: "Settings", icon: "⚙️", href: "/settings", color: "#98A1BC" },
    ],
  };

  const recentActivity = [
    { action: "Credential verified", time: "2 minutes ago", icon: "✅" },
    { action: "Profile viewed", time: "1 hour ago", icon: "👁️" },
    { action: "Logged in", time: "3 hours ago", icon: "🔐" },
  ];

  const actions = quickActions[user?.role] || quickActions[ROLES.HOLDER];

  return (
    <>
      <Head>
        <title>Dashboard - VeriChain</title>
        <meta name="description" content="VeriChain Dashboard" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton fallbackPath="/login" label="Logout" />
          </div>

          {/* Welcome Section */}
          <div className="glass-card p-6 rounded-lg mb-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Welcome back! 👋
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {user?.displayName} • <span className="capitalize">{user?.role}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="glass-card px-4 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Wallet</span>
                  <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{user?.address?.slice(0, 10)}...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-5 rounded-lg animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                >
                  🎓
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+12%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Credentials</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.credentials}</p>
            </div>

            <div className="glass-card p-5 rounded-lg animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: 'rgba(196, 163, 90, 0.1)', border: '1px solid rgba(196, 163, 90, 0.25)' }}
                >
                  📜
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+5%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {hasRole(ROLES.INSTITUTION) ? "Issued" : "Received"}
              </p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.issued}</p>
            </div>

            <div className="glass-card p-5 rounded-lg animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: 'rgba(93, 138, 102, 0.1)', border: '1px solid rgba(93, 138, 102, 0.25)' }}
                >
                  ✅
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+25%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Verifications</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.verified}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {actions.map((action, idx) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="glass-card p-5 rounded-lg text-center transition-normal animate-fade-in-up group"
                  style={{ animationDelay: `${0.1 * idx}s` }}
                >
                  <div 
                    className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-xl mb-3 transition-normal group-hover:scale-105"
                    style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}
                  >
                    {action.icon}
                  </div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{action.title}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity & Profile */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <div className="glass-card p-5 rounded-lg animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg transition-normal" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--accent-subtle)' }}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{activity.action}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm font-medium transition-normal" style={{ color: 'var(--primary)' }}>
                View All Activity →
              </button>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-5 rounded-lg animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Your Profile</h2>
              <div className="flex items-center gap-4 mb-5">
                <div 
                  className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(85, 88, 121, 0.1)', border: '1px solid rgba(85, 88, 121, 0.25)' }}
                >
                  {user?.role === ROLES.INSTITUTION ? "🏛️" : "🎓"}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
                  <p className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{user?.role}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-5">
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Wallet</span>
                  <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {user?.address?.slice(0, 8)}...{user?.address?.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Status</span>
                  <span className="text-sm flex items-center gap-2" style={{ color: 'var(--success)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></div>
                    Active
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Member Since</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>January 2026</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/profile"
                  className="flex-1 btn-secondary py-2 rounded-lg text-center font-medium text-sm"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg transition-normal font-medium text-sm"
                  style={{ background: 'var(--error-subtle)', color: 'var(--error)' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
