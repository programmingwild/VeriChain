/**
 * VeriChain Signup Page
 * Glassmorphism design with wallet-based registration
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth, ROLES } from "../context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading, error: authError } = useAuth();
  
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    institutionName: "",
    institutionType: "",
    agreeTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && mounted) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, mounted, router]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleSignup = async () => {
    if (!formData.agreeTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(selectedRole, true);
      
      // In a real app, you'd save additional profile data to a backend
      // For now, we'll store it in localStorage
      const profile = {
        ...formData,
        role: selectedRole,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("verichain_profile", JSON.stringify(profile));
      
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: ROLES.INSTITUTION,
      title: "Institution",
      description: "Universities, companies, and certification bodies",
      icon: "🏛️",
      color: "#555879",
      features: ["Issue credentials", "Manage recipients", "Track issuance"],
    },
    {
      id: ROLES.HOLDER,
      title: "Credential Holder",
      description: "Students, professionals, and certificate holders",
      icon: "🎓",
      color: "#5D8A66",
      features: ["View credentials", "Share verifiable links", "Export certificates"],
    },
  ];

  const institutionTypes = [
    "University",
    "College",
    "Training Provider",
    "Professional Association",
    "Corporate",
    "Government",
    "Other",
  ];

  if (authLoading) {
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
        <title>Sign Up - VeriChain</title>
        <meta name="description" content="Create your VeriChain account" />
      </Head>

      <div className="min-h-screen animated-bg overflow-hidden">
        {/* Floating orbs */}
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Logo */}
          <div className="mb-8 text-center animate-fade-in-down">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>VeriChain</span>
            </Link>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8 animate-fade-in">
            <div className="flex items-center gap-2" style={{ color: step >= 1 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
                style={{ 
                  background: step >= 1 ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: step >= 1 ? 'white' : 'var(--text-tertiary)'
                }}
              >
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="hidden sm:inline text-sm">Choose Role</span>
            </div>
            <div className="w-10 h-0.5" style={{ background: step >= 2 ? 'var(--primary)' : 'var(--bg-tertiary)' }}></div>
            <div className="flex items-center gap-2" style={{ color: step >= 2 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
                style={{ 
                  background: step >= 2 ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: step >= 2 ? 'white' : 'var(--text-tertiary)'
                }}
              >
                2
              </div>
              <span className="hidden sm:inline text-sm">Your Details</span>
            </div>
          </div>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="glass-card w-full max-w-2xl p-8 rounded-lg animate-fade-in-up">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Join VeriChain</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Select how you'll use VeriChain</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="glass-card p-6 rounded-lg text-left transition-normal group"
                  >
                    <div 
                      className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl mb-4 transition-normal group-hover:scale-105"
                      style={{ background: `${role.color}15`, border: `1px solid ${role.color}30` }}
                    >
                      {role.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{role.title}</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>{role.description}</p>
                    <ul className="space-y-2">
                      {role.features.map((feature, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--success)' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium transition-normal" style={{ color: 'var(--primary)' }}>
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Details Form */}
          {step === 2 && (
            <div className="glass-card w-full max-w-lg p-8 rounded-lg animate-fade-in-up">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 transition-normal mb-6"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="text-center mb-8">
                <div 
                  className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center text-2xl mb-4"
                  style={{ 
                    background: 'rgba(85, 88, 121, 0.1)',
                    border: '1px solid rgba(85, 88, 121, 0.25)'
                  }}
                >
                  {selectedRole === ROLES.INSTITUTION ? "🏛️" : "🎓"}
                </div>
                <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {selectedRole === ROLES.INSTITUTION ? "Institution Details" : "Your Details"}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Complete your profile to continue</p>
              </div>

              {/* Error Message */}
              {(error || authError) && (
                <div className="alert alert-error mb-6 animate-shake">
                  <span>⚠️</span>
                  <p className="text-sm">{error || authError}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="form-label">
                    {selectedRole === ROLES.INSTITUTION ? "Contact Name" : "Display Name"}
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="glass-input w-full px-4 py-3 rounded-lg"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="glass-input w-full px-4 py-3 rounded-lg"
                  />
                </div>

                {/* Institution-specific fields */}
                {selectedRole === ROLES.INSTITUTION && (
                  <>
                    <div>
                      <label className="form-label">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        name="institutionName"
                        value={formData.institutionName}
                        onChange={handleInputChange}
                        placeholder="Massachusetts Institute of Technology"
                        className="glass-input w-full px-4 py-3 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="form-label">
                        Institution Type
                      </label>
                      <select
                        name="institutionType"
                        value={formData.institutionType}
                        onChange={handleInputChange}
                        className="glass-input w-full px-4 py-3 rounded-lg"
                      >
                        <option value="">Select type...</option>
                        {institutionTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Terms */}
                <div className="flex items-start gap-3 pt-4">
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, agreeTerms: !prev.agreeTerms }))}
                    className="w-5 h-5 mt-0.5 rounded border-2 transition-normal flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: formData.agreeTerms ? 'var(--accent)' : 'transparent',
                      borderColor: formData.agreeTerms ? 'var(--accent)' : 'rgba(255,255,255,0.2)'
                    }}
                  >
                    {formData.agreeTerms && (
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    I agree to the{" "}
                    <Link href="/terms" className="transition-normal" style={{ color: 'var(--primary)' }}>
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="transition-normal" style={{ color: 'var(--primary)' }}>
                      Privacy Policy
                    </Link>
                  </span>
                </div>
              </div>

              {/* Signup Button */}
              <button
                onClick={handleSignup}
                disabled={loading || !formData.agreeTerms}
                className="w-full btn-primary py-3 rounded-lg font-medium mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="spinner"></div>
                    Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Connect Wallet & Sign Up
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
