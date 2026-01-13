/**
 * VeriChain Back Button Component
 * Reusable navigation component for going back
 */

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function BackButton({ fallbackPath = "/dashboard", label = "Back" }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Track navigation within the app using sessionStorage
    if (typeof window !== "undefined") {
      // Get the navigation history from sessionStorage
      const navHistory = JSON.parse(sessionStorage.getItem("verichain_nav_history") || "[]");
      
      // Add current page to history if not already the last entry
      const currentPath = window.location.pathname;
      if (navHistory[navHistory.length - 1] !== currentPath) {
        navHistory.push(currentPath);
        // Keep only last 10 entries
        if (navHistory.length > 10) navHistory.shift();
        sessionStorage.setItem("verichain_nav_history", JSON.stringify(navHistory));
      }
      
      // Can go back if there's more than 1 entry in our tracked history
      setCanGoBack(navHistory.length > 1);
    }
  }, [router.asPath]);

  const handleBack = () => {
    if (typeof window !== "undefined") {
      const navHistory = JSON.parse(sessionStorage.getItem("verichain_nav_history") || "[]");
      
      if (navHistory.length > 1) {
        // Remove current page
        navHistory.pop();
        // Get the previous page
        const previousPath = navHistory[navHistory.length - 1];
        // Update storage
        sessionStorage.setItem("verichain_nav_history", JSON.stringify(navHistory));
        // Navigate to previous page
        router.push(previousPath);
      } else {
        // Fallback to default path
        router.push(fallbackPath);
      }
    } else {
      router.push(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-normal text-sm"
      style={{ 
        background: 'var(--bg-tertiary)', 
        color: 'var(--text-secondary)',
        border: '1px solid var(--acrylic-border)'
      }}
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M10 19l-7-7m0 0l7-7m-7 7h18" 
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
