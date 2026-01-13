/**
 * VeriChain - Batch Issue Credentials Page
 * Windows 11 Fluent Design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../../context/AuthContext";
import Header from "../../components/Header";
import BackButton from "../../components/BackButton";

export default function BatchIssuePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [recipients, setRecipients] = useState([
    { address: "", name: "", credentialTitle: "" },
  ]);
  const [commonSettings, setCommonSettings] = useState({
    credentialType: "degree",
    expirationDate: "",
    metadata: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/issue/batch");
    } else if (!loading && user?.role !== ROLES.INSTITUTION && user?.role !== ROLES.ADMIN) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, user, router]);

  const addRecipient = () => {
    setRecipients([...recipients, { address: "", name: "", credentialTitle: "" }]);
  };

  const removeRecipient = (index) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const lines = text.split("\n").filter((line) => line.trim());
      const parsed = lines.slice(1).map((line) => {
        const [address, name, credentialTitle] = line.split(",").map((s) => s.trim());
        return { address, name, credentialTitle };
      });
      if (parsed.length > 0) {
        setRecipients(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate batch issuance
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setResults({
      success: recipients.filter((r) => r.address && r.credentialTitle).length,
      failed: recipients.filter((r) => !r.address || !r.credentialTitle).length,
      txHashes: recipients.map((_, i) => `0x${Math.random().toString(16).slice(2, 10)}...`),
    });
    
    setIsSubmitting(false);
    setStep(3);
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
        <title>Batch Issue - VeriChain</title>
        <meta name="description" content="Issue multiple credentials at once" />
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
          <BackButton fallbackPath="/issue" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/issue" className="hover:opacity-80 transition-normal" style={{ color: 'var(--text-secondary)' }}>
              Issue
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)' }}>Batch Issue</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Batch Issue Credentials</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Issue multiple credentials to different recipients at once</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-normal"
                  style={{
                    background: step >= s ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: step >= s ? 'white' : 'var(--text-tertiary)'
                  }}
                >
                  {step > s ? "✓" : s}
                </div>
                <span className="text-sm" style={{ color: step >= s ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {s === 1 ? "Recipients" : s === 2 ? "Settings" : "Complete"}
                </span>
                {s < 3 && <div className="w-8 h-px ml-2" style={{ background: 'var(--acrylic-border)' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Recipients */}
          {step === 1 && (
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Add Recipients</h2>
                <label className="btn-secondary px-4 py-2 rounded-lg text-sm cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  📄 Upload CSV
                </label>
              </div>

              <div className="space-y-4 mb-6">
                {recipients.map((recipient, index) => (
                  <div key={index} className="grid md:grid-cols-4 gap-4 items-start">
                    <input
                      type="text"
                      value={recipient.address}
                      onChange={(e) => updateRecipient(index, "address", e.target.value)}
                      placeholder="Wallet address (0x...)"
                      className="glass-input font-mono text-sm"
                    />
                    <input
                      type="text"
                      value={recipient.name}
                      onChange={(e) => updateRecipient(index, "name", e.target.value)}
                      placeholder="Recipient name"
                      className="glass-input"
                    />
                    <input
                      type="text"
                      value={recipient.credentialTitle}
                      onChange={(e) => updateRecipient(index, "credentialTitle", e.target.value)}
                      placeholder="Credential title"
                      className="glass-input"
                    />
                    <button
                      onClick={() => removeRecipient(index)}
                      className="glass-input text-red-400 hover:text-red-300 transition-normal"
                      disabled={recipients.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRecipient}
                className="btn-secondary px-4 py-2 rounded-lg text-sm mb-6"
              >
                + Add Another Recipient
              </button>

              <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
                💡 Tip: Upload a CSV file with columns: address, name, credentialTitle
              </p>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="btn-primary px-6 py-2 rounded-lg"
                  disabled={!recipients.some((r) => r.address)}
                >
                  Next: Settings →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Common Settings */}
          {step === 2 && (
            <div className="glass-card rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Common Settings</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                These settings will be applied to all {recipients.filter((r) => r.address).length} credentials
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="form-label">Credential Type</label>
                  <select
                    value={commonSettings.credentialType}
                    onChange={(e) =>
                      setCommonSettings({ ...commonSettings, credentialType: e.target.value })
                    }
                    className="glass-input w-full"
                  >
                    <option value="degree">Degree</option>
                    <option value="certification">Certification</option>
                    <option value="course">Course Completion</option>
                    <option value="award">Award</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={commonSettings.expirationDate}
                    onChange={(e) =>
                      setCommonSettings({ ...commonSettings, expirationDate: e.target.value })
                    }
                    className="glass-input w-full"
                  />
                </div>

                <div>
                  <label className="form-label">Additional Metadata (Optional)</label>
                  <textarea
                    value={commonSettings.metadata}
                    onChange={(e) =>
                      setCommonSettings({ ...commonSettings, metadata: e.target.value })
                    }
                    rows={3}
                    className="glass-input w-full resize-none"
                    placeholder="Any additional information to include..."
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-tertiary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Preview</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {recipients.filter((r) => r.address).length} credentials will be issued as{" "}
                  <span style={{ color: 'var(--text-primary)' }}>{commonSettings.credentialType}</span>
                  {commonSettings.expirationDate && (
                    <>, expiring on <span style={{ color: 'var(--text-primary)' }}>{commonSettings.expirationDate}</span></>
                  )}
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary px-6 py-2 rounded-lg"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary px-6 py-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner inline-block w-4 h-4 mr-2"></span>
                      Issuing...
                    </>
                  ) : (
                    "Issue All Credentials"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && results && (
            <div className="glass-card rounded-lg p-6 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Batch Issue Complete!</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Successfully issued {results.success} credential{results.success !== 1 ? "s" : ""}
                {results.failed > 0 && ` (${results.failed} failed)`}
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="glass-card p-4 rounded-lg">
                  <p className="text-3xl font-semibold" style={{ color: 'var(--success)' }}>
                    {results.success}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Successful</p>
                </div>
                <div className="glass-card p-4 rounded-lg">
                  <p className="text-3xl font-semibold" style={{ color: 'var(--error)' }}>
                    {results.failed}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Failed</p>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Link href="/credentials/issued" className="btn-secondary px-6 py-2 rounded-lg">
                  View Issued
                </Link>
                <button
                  onClick={() => {
                    setStep(1);
                    setRecipients([{ address: "", name: "", credentialTitle: "" }]);
                    setResults(null);
                  }}
                  className="btn-primary px-6 py-2 rounded-lg"
                >
                  Issue More
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
