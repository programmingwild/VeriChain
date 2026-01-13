/**
 * VeriChain - View Issued Credentials Page (Institution)
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";

// Sample credentials for demo
const SAMPLE_CREDENTIALS = [
  {
    id: 1,
    recipientAddress: "0x1234...abcd",
    recipientName: "John Doe",
    title: "Bachelor of Science in Computer Science",
    issueDate: "2023-05-15",
    expirationDate: null,
    status: "active",
    txHash: "0xabc123...",
    hasPrivateData: true,
  },
  {
    id: 2,
    recipientAddress: "0x5678...efgh",
    recipientName: "Jane Smith",
    title: "Master of Business Administration",
    issueDate: "2023-06-20",
    expirationDate: null,
    status: "active",
    txHash: "0xdef456...",
    hasPrivateData: false,
  },
];

export default function IssuedCredentialsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, isDemoUser } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/credentials/issued");
    } else if (!loading && user?.role !== ROLES.INSTITUTION && user?.role !== ROLES.ADMIN) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, user, router]);

  // Load credentials (demo from localStorage + samples, or real from blockchain)
  useEffect(() => {
    if (isDemoUser) {
      // Load demo credentials from localStorage
      try {
        const demoCredentials = JSON.parse(localStorage.getItem('demo_credentials') || '[]');
        const formattedDemo = demoCredentials.map((cred) => ({
          id: cred.tokenId,
          recipientAddress: cred.recipient?.slice(0, 6) + '...' + cred.recipient?.slice(-4),
          recipientName: cred.recipientName,
          title: cred.achievementName,
          issueDate: new Date(cred.issuedAt).toISOString().split('T')[0],
          expirationDate: null,
          status: "active",
          txHash: cred.txHash?.slice(0, 10) + '...',
          hasPrivateData: cred.hasPrivateData,
          isDemo: true,
        }));
        // Combine with sample credentials
        setCredentials([...formattedDemo, ...SAMPLE_CREDENTIALS]);
      } catch (err) {
        setCredentials(SAMPLE_CREDENTIALS);
      }
    } else {
      // In real mode, would fetch from blockchain
      setCredentials(SAMPLE_CREDENTIALS);
    }
  }, [isDemoUser]);

  const handleRevoke = (id) => {
    setCredentials((prev) =>
      prev.map((cred) =>
        cred.id === id ? { ...cred, status: "revoked" } : cred
      )
    );
  };

  const filteredCredentials = credentials.filter((cred) => {
    const matchesFilter = filter === "all" || cred.status === filter;
    const matchesSearch =
      cred.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
        <title>Issued Credentials - VeriChain</title>
        <meta name="description" content="View credentials issued by your institution" />
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
            <span style={{ color: 'var(--text-primary)' }}>Issued Credentials</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Issued Credentials</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Manage credentials issued by your institution</p>
            </div>
            <Link href="/issue" className="btn-primary px-6 py-2 rounded-lg inline-flex items-center gap-2">
              <span>+</span> Issue New
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{credentials.length}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Issued</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                {credentials.filter((c) => c.status === "active").length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--error)' }}>
                {credentials.filter((c) => c.status === "revoked").length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Revoked</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--warning)' }}>
                {credentials.filter((c) => c.expirationDate).length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>With Expiration</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by recipient or credential..."
                  className="glass-input w-full"
                />
              </div>
              <div className="flex gap-2">
                {["all", "active", "revoked"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-normal ${
                      filter === status
                        ? "btn-primary"
                        : "glass-card hover:bg-white/5"
                    }`}
                    style={filter === status ? {} : { background: 'transparent' }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Credentials Table */}
          <div className="glass-card rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                  <th className="text-left p-4 font-medium text-sm" style={{ color: 'var(--text-tertiary)' }}>Recipient</th>
                  <th className="text-left p-4 font-medium text-sm" style={{ color: 'var(--text-tertiary)' }}>Credential</th>
                  <th className="text-left p-4 font-medium text-sm hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Issue Date</th>
                  <th className="text-left p-4 font-medium text-sm" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                  <th className="text-right p-4 font-medium text-sm" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredentials.map((cred) => (
                  <tr key={cred.id} className="hover:bg-white/5 transition-normal" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                    <td className="p-4">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{cred.recipientName}</p>
                      <p className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>{cred.recipientAddress}</p>
                    </td>
                    <td className="p-4">
                      <p style={{ color: 'var(--text-primary)' }}>{cred.title}</p>
                      {cred.expirationDate && (
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Expires: {cred.expirationDate}</p>
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {cred.issueDate}
                    </td>
                    <td className="p-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: cred.status === "active" ? 'rgba(93, 138, 102, 0.15)' : 'rgba(184, 92, 92, 0.15)',
                          color: cred.status === "active" ? '#5d8a66' : '#b85c5c'
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: cred.status === "active" ? "var(--success)" : "var(--error)",
                          }}
                        />
                        {cred.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {cred.status === "active" ? (
                        <button
                          onClick={() => handleRevoke(cred.id)}
                          className="text-sm transition-normal"
                          style={{ color: '#b85c5c' }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredCredentials.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📋</div>
                <p style={{ color: 'var(--text-tertiary)' }}>No credentials found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
