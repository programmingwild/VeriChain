/**
 * VeriChain Credential Card Component
 * Elegant warm design for credential display
 */

import { useState } from "react";
import {
  formatAddress,
  getAddressExplorerUrl,
  generateQRCode,
  CHAIN_ID,
  CONTRACT_ADDRESS,
} from "../utils/contract";
import { downloadCertificatePDF } from "../utils/generateCertificatePDF";

export default function CredentialCard({ credential, expanded = false }) {
  const [showDetails, setShowDetails] = useState(expanded);
  const [qrCode, setQrCode] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const {
    tokenId,
    isValid,
    issuer,
    holder,
    issuedAt,
    issuedAtDate,
    tokenURI,
    isRevoked,
    isInstitutionAuthorized,
    metadata,
  } = credential;

  // Extract attributes from metadata
  const getAttributeValue = (traitType) => {
    if (!metadata?.attributes) return null;
    const attr = metadata.attributes.find((a) => a.trait_type === traitType);
    return attr?.value;
  };

  const credentialName = metadata?.name || `Credential #${tokenId}`;
  const credentialType = getAttributeValue("Credential Type") || "Unknown";
  const institution = getAttributeValue("Issuing Institution") || formatAddress(issuer);
  const recipientName = getAttributeValue("Recipient Name");
  const issueDate = getAttributeValue("Issue Date") || issuedAtDate?.toLocaleDateString();
  const expirationDate = getAttributeValue("Expiration Date");

  const handleGenerateQR = async () => {
    setLoadingQR(true);
    try {
      const result = await generateQRCode(tokenId, CONTRACT_ADDRESS, CHAIN_ID);
      if (result.success) {
        setQrCode(result.qrCode);
      }
    } catch (err) {
      console.error("QR generation error:", err);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await downloadCertificatePDF({
        tokenId,
        title: credentialName,
        description: metadata?.description || '',
        institution,
        recipient: holder,
        recipientName,
        issueDate,
        contractAddress: CONTRACT_ADDRESS,
      });
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="credential-card overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3"
        style={{
          background: isRevoked
            ? 'var(--error-subtle)'
            : isValid
            ? 'var(--success-subtle)'
            : 'var(--warning-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: isRevoked
                  ? 'var(--error)'
                  : isValid
                  ? 'var(--success)'
                  : 'var(--warning)'
              }}
            />
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Token #{tokenId}
              </span>
              <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{credentialName}</h3>
            </div>
          </div>
          <div
            className={`credential-badge ${
              isRevoked ? "revoked" : !isValid ? "expired" : ""
            }`}
          >
            {isRevoked ? "⛔ Revoked" : isValid ? "✅ Valid" : "⚠️ Invalid"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Type</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{credentialType}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Issued</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{issueDate || "Unknown"}</p>
          </div>
        </div>

        {/* Institution */}
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Issuing Institution</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{institution}</p>
            {!isInstitutionAuthorized && !isRevoked && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(196, 163, 90, 0.3)' }}>
                Institution no longer authorized
              </span>
            )}
          </div>
        </div>

        {/* Holder */}
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Credential Holder</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {recipientName && <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{recipientName}</p>}
            <a
              href={getAddressExplorerUrl(holder, CHAIN_ID) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm transition-normal hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              {formatAddress(holder)}
            </a>
          </div>
        </div>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm font-medium flex items-center gap-1 transition-normal hover:opacity-80"
          style={{ color: 'var(--primary)' }}
        >
          {showDetails ? "Hide Details" : "Show Details"}
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 space-y-4 animate-fade-in" style={{ borderTop: '1px solid var(--acrylic-border)' }}>
            {/* Issuer Address */}
            <div>
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Issuer Address</span>
              <a
                href={getAddressExplorerUrl(issuer, CHAIN_ID) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-sm break-all transition-normal hover:opacity-80"
                style={{ color: 'var(--primary)' }}
              >
                {issuer}
              </a>
            </div>

            {/* Token URI */}
            <div>
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Metadata URI</span>
              <p className="font-mono text-sm break-all" style={{ color: 'var(--text-tertiary)' }}>{tokenURI}</p>
            </div>

            {/* Expiration */}
            {expirationDate && (
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Expires</span>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {new Date(expirationDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Description */}
            {metadata?.description && (
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Description</span>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{metadata.description}</p>
              </div>
            )}

            {/* Additional Attributes */}
            {metadata?.attributes && (
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>All Attributes</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {metadata.attributes.map((attr, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs"
                      style={{ background: 'var(--accent-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--acrylic-border)' }}
                    >
                      {attr.trait_type}: <span style={{ color: 'var(--text-primary)' }}>{attr.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleGenerateQR}
                disabled={loadingQR}
                className="btn-secondary text-sm px-4 py-2 rounded-md"
              >
                {loadingQR ? "Generating..." : qrCode ? "Regenerate QR" : "Generate QR Code"}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="btn-primary text-sm px-4 py-2 rounded-md flex items-center gap-2"
              >
                {downloadingPDF ? (
                  "Generating..."
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
            
            {qrCode && (
              <div className="mt-3 p-4 glass-card rounded-lg inline-block">
                <img src={qrCode} alt="Verification QR Code" className="w-48 h-48 rounded-md" />
                <p className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>Scan to verify & download certificate</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Revocation Warning */}
      {isRevoked && (
        <div className="px-6 py-3" style={{ background: 'var(--error-subtle)', borderTop: '1px solid rgba(184, 92, 92, 0.2)' }}>
          <p className="text-sm flex items-center gap-2" style={{ color: 'var(--error)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            This credential has been revoked and is no longer valid
          </p>
        </div>
      )}
    </div>
  );
}
