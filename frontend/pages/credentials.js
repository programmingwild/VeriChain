/**
 * VeriChain - My Credentials Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import CredentialCard from "../components/CredentialCard";
import BackButton from "../components/BackButton";

// Mock credentials for demo
const MOCK_CREDENTIALS = [
  {
    id: 1,
    title: "Bachelor of Science in Computer Science",
    institution: "MIT",
    issueDate: "2023-05-15",
    expirationDate: null,
    credentialType: "degree",
    status: "valid",
    credentialHash: "0xabcd...1234",
  },
  {
    id: 2,
    title: "AWS Solutions Architect",
    institution: "Amazon Web Services",
    issueDate: "2024-01-10",
    expirationDate: "2027-01-10",
    credentialType: "certification",
    status: "valid",
    credentialHash: "0xefgh...5678",
  },
  {
    id: 3,
    title: "Blockchain Developer Certification",
    institution: "Ethereum Foundation",
    issueDate: "2023-09-20",
    expirationDate: "2025-09-20",
    credentialType: "certification",
    status: "valid",
    credentialHash: "0xijkl...9012",
  },
];

export default function CredentialsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/credentials");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    // Load credentials from localStorage or use mock data
    const saved = localStorage.getItem("verichain_credentials");
    if (saved) {
      setCredentials(JSON.parse(saved));
    } else {
      setCredentials(MOCK_CREDENTIALS);
    }
  }, []);

  const filteredCredentials = credentials.filter((cred) => {
    const matchesFilter = filter === "all" || cred.credentialType === filter;
    const matchesSearch =
      cred.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.institution.toLowerCase().includes(searchTerm.toLowerCase());
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
        <title>My Credentials - VeriChain</title>
        <meta name="description" content="View your credentials on VeriChain" />
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
          <div className="mb-4">
            <BackButton fallbackPath="/dashboard" />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="transition-normal" style={{ color: 'var(--text-tertiary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>My Credentials</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>My Credentials</h1>
              <p style={{ color: 'var(--text-secondary)' }}>View and manage your verified credentials</p>
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
                  placeholder="Search credentials..."
                  className="glass-input w-full"
                />
              </div>
              <div className="flex gap-2">
                {["all", "degree", "certification", "course"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-normal ${
                      filter === type
                        ? "btn-primary"
                        : ""
                    }`}
                    style={filter === type ? {} : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--acrylic-border)' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{credentials.length}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Credentials</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                {credentials.filter((c) => c.status === "valid").length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--warning)' }}>
                {credentials.filter((c) => c.expirationDate).length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Expiring</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-2xl font-semibold" style={{ color: 'var(--primary)' }}>
                {credentials.filter((c) => c.credentialType === "certification").length}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Certifications</p>
            </div>
          </div>

          {/* Credentials Grid */}
          {filteredCredentials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCredentials.map((credential) => (
                <CredentialCard key={credential.id} credential={credential} />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-lg p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {searchTerm || filter !== "all" ? "No matching credentials" : "No Credentials Yet"}
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                {searchTerm || filter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Your verified credentials will appear here once issued"}
              </p>
              <Link
                href="/"
                className="btn-primary px-6 py-3 rounded-lg inline-block"
              >
                Explore Institutions
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
