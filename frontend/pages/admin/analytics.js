/**
 * VeriChain Admin - Analytics Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const [timeRange, setTimeRange] = useState("30d");
  const [stats, setStats] = useState({
    totalCredentials: 479,
    activeInstitutions: 12,
    totalVerifications: 2847,
    revokedCredentials: 23,
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole(ROLES.ADMIN))) {
      router.push("/login?redirect=/admin/analytics");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="glass-card p-8 rounded-lg">
          <div className="loading-spinner mx-auto"></div>
        </div>
      </div>
    );
  }

  const recentActivity = [
    { action: "Credential Issued", institution: "MIT", time: "2 min ago", type: "issue" },
    { action: "Institution Authorized", institution: "Yale University", time: "15 min ago", type: "auth" },
    { action: "Credential Verified", institution: "Stanford", time: "32 min ago", type: "verify" },
    { action: "Credential Revoked", institution: "Harvard", time: "1 hour ago", type: "revoke" },
    { action: "Batch Issue (25)", institution: "MIT", time: "2 hours ago", type: "issue" },
    { action: "Credential Verified", institution: "MIT", time: "3 hours ago", type: "verify" },
  ];

  const topInstitutions = [
    { name: "MIT", credentials: 156, percentage: 33 },
    { name: "Stanford University", credentials: 89, percentage: 19 },
    { name: "Harvard University", credentials: 78, percentage: 16 },
    { name: "Yale University", credentials: 65, percentage: 14 },
    { name: "Princeton University", credentials: 45, percentage: 9 },
  ];

  return (
    <>
      <Head>
        <title>Analytics - VeriChain Admin</title>
        <meta name="description" content="View system analytics" />
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
            <BackButton fallbackPath="/dashboard" />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Analytics</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                System Analytics
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Monitor credential issuance and verification activity
              </p>
            </div>
            <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--acrylic-border)' }}>
              {["7d", "30d", "90d", "1y"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-normal"
                  style={{
                    background: timeRange === range ? "var(--primary)" : "transparent",
                    color: timeRange === range ? "white" : "var(--text-secondary)"
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(85, 88, 121, 0.15)", border: "1px solid rgba(85, 88, 121, 0.3)" }}
                >
                  📜
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+12%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Credentials</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.totalCredentials}</p>
            </div>

            <div className="glass-card p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(93, 138, 102, 0.15)", border: "1px solid rgba(93, 138, 102, 0.3)" }}
                >
                  🏛️
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+2</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active Institutions</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.activeInstitutions}</p>
            </div>

            <div className="glass-card p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(196, 163, 90, 0.15)", border: "1px solid rgba(196, 163, 90, 0.3)" }}
                >
                  ✅
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>+28%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Verifications</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.totalVerifications}</p>
            </div>

            <div className="glass-card p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "rgba(184, 92, 92, 0.15)", border: "1px solid rgba(184, 92, 92, 0.3)" }}
                >
                  ⛔
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>4.8%</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Revoked</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.revokedCredentials}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Institutions */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Top Institutions</h2>
              </div>
              <div className="p-6 space-y-4">
                {topInstitutions.map((inst, idx) => (
                  <div key={inst.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{inst.name}</span>
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{inst.credentials}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${inst.percentage}%`,
                          background: idx === 0 ? "var(--primary)" : "var(--secondary)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
              </div>
              <div style={{ borderTop: '1px solid var(--acrylic-border)' }}>
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="px-6 py-3 flex items-center gap-4" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-sm"
                      style={{
                        background:
                          activity.type === "issue"
                            ? "rgba(85, 88, 121, 0.15)"
                            : activity.type === "verify"
                            ? "rgba(93, 138, 102, 0.15)"
                            : activity.type === "revoke"
                            ? "rgba(184, 92, 92, 0.15)"
                            : "rgba(196, 163, 90, 0.15)",
                      }}
                    >
                      {activity.type === "issue"
                        ? "📜"
                        : activity.type === "verify"
                        ? "✅"
                        : activity.type === "revoke"
                        ? "⛔"
                        : "🏛️"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{activity.action}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{activity.institution}</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
