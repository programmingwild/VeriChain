/**
 * VeriChain - User Settings Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BackButton from "../components/BackButton";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    credentialAlerts: true,
    expirationReminders: true,
    marketingEmails: false,
    darkMode: true,
    compactView: false,
    language: "en",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/settings");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const savedSettings = localStorage.getItem("verichain_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("verichain_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch = ({ enabled, onChange }) => (
    <div
      className={`w-12 h-6 rounded-full transition-all cursor-pointer flex items-center ${
        enabled ? "bg-[var(--accent)]" : "bg-white/20"
      }`}
      onClick={onChange}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </div>
  );

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
        <title>Settings - VeriChain</title>
        <meta name="description" content="Your VeriChain settings" />
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
          <div className="mb-4">
            <BackButton fallbackPath="/dashboard" />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="transition-normal" style={{ color: 'var(--text-tertiary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Settings</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Manage your preferences</p>
            </div>
            <button
              onClick={handleSave}
              className="btn-primary px-6 py-2 rounded-lg"
            >
              {saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Email Notifications</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Receive updates via email</p>
                </div>
                <ToggleSwitch
                  enabled={settings.emailNotifications}
                  onChange={() =>
                    setSettings({ ...settings, emailNotifications: !settings.emailNotifications })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Credential Alerts</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Get notified when you receive new credentials</p>
                </div>
                <ToggleSwitch
                  enabled={settings.credentialAlerts}
                  onChange={() =>
                    setSettings({ ...settings, credentialAlerts: !settings.credentialAlerts })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Expiration Reminders</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Remind me before credentials expire</p>
                </div>
                <ToggleSwitch
                  enabled={settings.expirationReminders}
                  onChange={() =>
                    setSettings({ ...settings, expirationReminders: !settings.expirationReminders })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Marketing Emails</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Receive news and promotional content</p>
                </div>
                <ToggleSwitch
                  enabled={settings.marketingEmails}
                  onChange={() =>
                    setSettings({ ...settings, marketingEmails: !settings.marketingEmails })
                  }
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Dark Mode</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Use dark theme</p>
                </div>
                <ToggleSwitch
                  enabled={settings.darkMode}
                  onChange={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Compact View</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Show more content with less spacing</p>
                </div>
                <ToggleSwitch
                  enabled={settings.compactView}
                  onChange={() =>
                    setSettings({ ...settings, compactView: !settings.compactView })
                  }
                />
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Language & Region</h2>
            <div>
              <label className="form-label">Language</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="glass-input w-full"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>

          {/* Account Info */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Connected Wallet</p>
                <p className="font-mono text-sm break-all" style={{ color: 'var(--text-primary)' }}>{user?.address}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Role</p>
                <p className="capitalize" style={{ color: 'var(--text-primary)' }}>{user?.role}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Member Since</p>
                <p style={{ color: 'var(--text-primary)' }}>January 2024</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-lg p-6" style={{ border: '1px solid rgba(184, 92, 92, 0.3)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              These actions are irreversible. Please be careful.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  localStorage.removeItem("verichain_settings");
                  localStorage.removeItem("verichain_profile");
                  setSettings({
                    emailNotifications: true,
                    credentialAlerts: true,
                    expirationReminders: true,
                    marketingEmails: false,
                    darkMode: true,
                    compactView: false,
                    language: "en",
                  });
                }}
                className="px-4 py-2 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25 transition-normal text-sm"
              >
                Reset All Settings
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-normal text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
