/**
 * VeriChain Admin - System Settings Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const [settings, setSettings] = useState({
    contractPaused: false,
    defaultExpirationDays: 365,
    maxBatchSize: 50,
    requireMetadataValidation: true,
    allowExpiredRevocation: false,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && (!isAuthenticated || !hasRole(ROLES.ADMIN))) {
      router.push("/login?redirect=/admin/settings");
    }
  }, [loading, isAuthenticated, hasRole, router]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSuccess(`Setting updated: ${key}`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      // In production, this would save to blockchain/backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess("All settings saved successfully");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
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

  const settingsGroups = [
    {
      title: "Contract Controls",
      icon: "⚙️",
      settings: [
        {
          key: "contractPaused",
          label: "Pause Contract",
          description: "Temporarily disable all contract operations",
          type: "toggle",
          danger: true,
        },
      ],
    },
    {
      title: "Credential Settings",
      icon: "📜",
      settings: [
        {
          key: "defaultExpirationDays",
          label: "Default Expiration (Days)",
          description: "Default number of days until credentials expire",
          type: "number",
        },
        {
          key: "maxBatchSize",
          label: "Max Batch Size",
          description: "Maximum credentials per batch operation",
          type: "number",
        },
      ],
    },
    {
      title: "Validation",
      icon: "✅",
      settings: [
        {
          key: "requireMetadataValidation",
          label: "Require Metadata Validation",
          description: "Validate metadata schema before issuance",
          type: "toggle",
        },
        {
          key: "allowExpiredRevocation",
          label: "Allow Expired Revocation",
          description: "Allow revoking already expired credentials",
          type: "toggle",
        },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>System Settings - VeriChain Admin</title>
        <meta name="description" content="Configure system settings" />
      </Head>

      <div className="min-h-screen animated-bg">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Header />

        <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <BackButton fallbackPath="/dashboard" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>System Settings</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                System Settings
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Configure contract and system parameters
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={actionLoading}
              className="btn-primary px-6 py-2.5 rounded-lg"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <div className="spinner"></div>
                  Saving...
                </span>
              ) : (
                "Save All Changes"
              )}
            </button>
          </div>

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success mb-6 animate-fade-in">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {/* Settings Groups */}
          <div className="space-y-6">
            {settingsGroups.map((group) => (
              <div key={group.title} className="glass-card rounded-lg overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--acrylic-border)' }}>
                  <span className="text-xl">{group.icon}</span>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{group.title}</h2>
                </div>
                <div>
                  {group.settings.map((setting) => (
                    <div
                      key={setting.key}
                      className="px-6 py-4 flex items-center justify-between gap-4"
                      style={{ borderBottom: '1px solid var(--acrylic-border)' }}
                    >
                      <div>
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{setting.label}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{setting.description}</p>
                      </div>
                      {setting.type === "toggle" ? (
                        <button
                          onClick={() => handleToggle(setting.key)}
                          className="relative w-12 h-7 rounded-full transition-normal"
                          style={{
                            background: settings[setting.key]
                              ? (setting.danger ? '#b85c5c' : '#5d8a66')
                              : 'var(--bg-tertiary)'
                          }}
                        >
                          <span
                            className="absolute top-1 w-5 h-5 bg-white rounded-full transition-normal"
                            style={{ left: settings[setting.key] ? '1.5rem' : '0.25rem' }}
                          />
                        </button>
                      ) : (
                        <input
                          type="number"
                          value={settings[setting.key]}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              [setting.key]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="glass-input w-24 text-center"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contract Info */}
          <div className="glass-card rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Contract Information</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p style={{ color: 'var(--text-tertiary)' }}>Contract Address</p>
                <p className="font-mono" style={{ color: 'var(--text-primary)' }}>0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-tertiary)' }}>Network</p>
                <p style={{ color: 'var(--text-primary)' }}>Localhost (Chain ID: 31337)</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-tertiary)' }}>Contract Version</p>
                <p style={{ color: 'var(--text-primary)' }}>VeriChainCredentialV2</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-tertiary)' }}>Owner</p>
                <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{user?.address?.slice(0, 20)}...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
