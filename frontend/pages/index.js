/**
 * VeriChain - Landing Page
 * Redirects to login or dashboard based on auth status
 */

import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth, ROLES } from "../context/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      // Redirect based on role
      if (user?.role === ROLES.ADMIN) {
        router.replace("/dashboard");
      } else if (user?.role === ROLES.INSTITUTION) {
        router.replace("/dashboard");
      } else {
        // Holder
        router.replace("/holder");
      }
    } else {
      // Not authenticated, go to login
      router.replace("/login");
    }
  }, [isAuthenticated, loading, user, router]);

  return (
    <>
      <Head>
        <title>VeriChain - Decentralized Credentials</title>
        <meta name="description" content="Decentralized Proof-of-Achievement System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen animated-bg flex items-center justify-center">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="glass-card p-8 rounded-lg text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading VeriChain...</p>
        </div>
      </div>
    </>
  );
}
