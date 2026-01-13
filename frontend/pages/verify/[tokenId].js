/**
 * VeriChain - Credential Verification & PDF Download Page
 * This page is accessed when scanning a QR code from a certificate
 * It verifies the credential on-chain and allows PDF certificate download
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ethers } from 'ethers';
import { generateCertificatePDF, downloadCertificatePDF } from '../../utils/generateCertificatePDF';

// Contract ABI (minimal for verification)
const CONTRACT_ABI = [
  "function getCredential(uint256 tokenId) view returns (tuple(string title, string description, string institution, address recipient, uint256 issueDate, string metadata, bool revoked))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3';

export default function VerifyCredential() {
  const router = useRouter();
  const { tokenId, autoDownload } = router.query;
  
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (tokenId) {
      verifyCredential();
    }
  }, [tokenId]);

  // Auto-download PDF if requested via QR code
  useEffect(() => {
    if (autoDownload === 'true' && credential && !downloadStarted) {
      handleDownloadPDF();
      setDownloadStarted(true);
    }
  }, [autoDownload, credential, downloadStarted]);

  const verifyCredential = async () => {
    try {
      setLoading(true);
      setError(null);
      setVerificationStatus('verifying');

      // Connect to the blockchain
      let provider;
      if (typeof window !== 'undefined' && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // Fallback to localhost for development
        provider = new ethers.JsonRpcProvider('http://localhost:8545');
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Fetch credential data
      const credentialData = await contract.getCredential(tokenId);
      const owner = await contract.ownerOf(tokenId);

      // Check if credential is valid (not revoked)
      if (credentialData.revoked) {
        setVerificationStatus('revoked');
        setError('This credential has been revoked by the issuing institution.');
      } else {
        setVerificationStatus('verified');
      }

      // Format credential object
      setCredential({
        tokenId: tokenId,
        title: credentialData.title,
        description: credentialData.description,
        institution: credentialData.institution,
        recipient: credentialData.recipient,
        owner: owner,
        issueDate: new Date(Number(credentialData.issueDate) * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        issueDateRaw: Number(credentialData.issueDate),
        metadata: credentialData.metadata,
        revoked: credentialData.revoked,
        contractAddress: CONTRACT_ADDRESS
      });

    } catch (err) {
      console.error('Verification error:', err);
      setVerificationStatus('error');
      
      if (err.message.includes('ERC721NonexistentToken') || err.message.includes('invalid token')) {
        setError('This credential does not exist. The token ID may be invalid.');
      } else if (err.message.includes('network')) {
        setError('Unable to connect to the blockchain network. Please try again.');
      } else {
        setError('Failed to verify credential. Please ensure you are connected to the correct network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!credential) return;
    
    try {
      await downloadCertificatePDF(credential);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <div className="status-icon verified">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,4 12,14.01 9,11.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'revoked':
        return (
          <div className="status-icon revoked">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/>
              <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="status-icon error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="status-icon pending">
            <div className="spinner"></div>
          </div>
        );
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Credential Verified';
      case 'revoked':
        return 'Credential Revoked';
      case 'error':
        return 'Verification Failed';
      case 'verifying':
        return 'Verifying on Blockchain...';
      default:
        return 'Preparing Verification...';
    }
  };

  return (
    <>
      <Head>
        <title>Verify Credential | VeriChain</title>
        <meta name="description" content="Verify blockchain credential authenticity" />
      </Head>

      <div className="verify-page">
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>

        <div className="verify-container">
          {/* Header */}
          <div className="verify-header">
            <Link href="/" className="logo-link">
              <div className="logo">
                <div className="logo-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <span>VeriChain</span>
              </div>
            </Link>
          </div>

          {/* Main Content */}
          <div className="verify-content glass-card">
            {/* Status Section */}
            <div className="status-section">
              {getStatusIcon()}
              <h1 className="status-title">{getStatusText()}</h1>
              {error && <p className="error-message">{error}</p>}
            </div>

            {/* Credential Details */}
            {credential && verificationStatus === 'verified' && (
              <>
                <div className="credential-details">
                  <div className="credential-header">
                    <div className="badge-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="6"/>
                        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="credential-title">{credential.title}</h2>
                      <p className="credential-institution">{credential.institution}</p>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Recipient</span>
                      <span className="detail-value address">{credential.recipient}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Issue Date</span>
                      <span className="detail-value">{credential.issueDate}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Token ID</span>
                      <span className="detail-value">#{credential.tokenId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contract</span>
                      <span className="detail-value address">{credential.contractAddress}</span>
                    </div>
                  </div>

                  {credential.description && (
                    <div className="description-section">
                      <span className="detail-label">Description</span>
                      <p className="description-text">{credential.description}</p>
                    </div>
                  )}
                </div>

                {/* Download Section */}
                <div className="download-section">
                  <button onClick={handleDownloadPDF} className="btn-primary download-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF Certificate
                  </button>
                  <p className="download-hint">
                    Save this certificate as a verified PDF document
                  </p>
                </div>

                {/* Blockchain Verification */}
                <div className="blockchain-section">
                  <div className="blockchain-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    <span>Verified on Ethereum Blockchain</span>
                  </div>
                </div>
              </>
            )}

            {/* Loading State */}
            {loading && (
              <div className="loading-section">
                <p>Connecting to blockchain and verifying credential...</p>
              </div>
            )}

            {/* Retry Button for Errors */}
            {verificationStatus === 'error' && (
              <div className="retry-section">
                <button onClick={verifyCredential} className="btn-secondary">
                  Try Again
                </button>
                <Link href="/" className="btn-outline">
                  Go Home
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="verify-footer">
            <p>Powered by VeriChain • Decentralized Credential Verification</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .verify-page {
          min-height: 100vh;
          background: var(--bg-primary);
          position: relative;
          padding: 40px 20px;
        }

        .verify-container {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .verify-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-link {
          text-decoration: none;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .logo span {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .verify-content {
          padding: 40px;
          text-align: center;
        }

        .status-section {
          margin-bottom: 32px;
        }

        .status-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .status-icon.verified {
          background: var(--success-subtle);
          color: var(--success);
        }

        .status-icon.revoked {
          background: var(--warning-subtle);
          color: var(--warning);
        }

        .status-icon.error {
          background: var(--error-subtle);
          color: var(--error);
        }

        .status-icon.pending {
          background: var(--accent-subtle);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--secondary);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .error-message {
          color: var(--error);
          font-size: 0.9375rem;
        }

        .credential-details {
          text-align: left;
          padding: 24px;
          background: var(--bg-elevated);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .credential-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--acrylic-border);
        }

        .badge-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .credential-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .credential-institution {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .detail-value {
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .detail-value.address {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.75rem;
          word-break: break-all;
        }

        .description-section {
          padding-top: 16px;
          border-top: 1px solid var(--acrylic-border);
        }

        .description-text {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          line-height: 1.6;
          margin-top: 8px;
        }

        .download-section {
          margin-bottom: 24px;
        }

        .download-btn {
          width: 100%;
          gap: 10px;
          padding: 16px 24px;
          font-size: 1rem;
        }

        .download-hint {
          margin-top: 12px;
          font-size: 0.875rem;
          color: var(--text-tertiary);
        }

        .blockchain-section {
          padding-top: 20px;
          border-top: 1px solid var(--acrylic-border);
        }

        .blockchain-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--accent-subtle);
          border-radius: 20px;
          font-size: 0.875rem;
          color: var(--primary);
          font-weight: 500;
        }

        .loading-section {
          padding: 40px 0;
          color: var(--text-secondary);
        }

        .retry-section {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        }

        .verify-footer {
          text-align: center;
          margin-top: 32px;
          color: var(--text-tertiary);
          font-size: 0.875rem;
        }

        @media (max-width: 480px) {
          .verify-content {
            padding: 24px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .credential-header {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
