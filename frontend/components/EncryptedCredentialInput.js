/**
 * VeriChain - Encrypted Credential Input Component
 * 
 * Allows users to encrypt sensitive credential data using Inco FHE
 * before submitting to the blockchain.
 * 
 * Based on: https://github.com/Inco-fhevm/nextjs-template
 */

import { useState, useEffect, useRef } from 'react';
import { useVeriChainEncryption, truncateHash, getExplorerUrl } from '../utils/inco';

export default function EncryptedCredentialInput({
  onEncrypted,
  walletAddress,
  contractAddress,
  disabled = false
}) {
  const { initialized, loading: hookLoading, isRealFHE, fee, encryptCredentialData } = useVeriChainEncryption();
  
  // Form state
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  
  // Encryption state
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedData, setEncryptedData] = useState(null);
  const [showFullEncrypted, setShowFullEncrypted] = useState(false);
  const [error, setError] = useState('');
  const isProcessingRef = useRef(false); // Prevent double-clicks

  const hasData = studentId || grade || dateOfBirth || personalEmail;

  // Generate a demo wallet address if none provided (for demo mode)
  const effectiveWalletAddress = walletAddress || '0xDEMO00000000000000000000000000INSTITUTE';
  const effectiveContractAddress = contractAddress || '0x0000000000000000000000000000000000000000';

  const handleEncrypt = async () => {
    if (!hasData || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsEncrypting(true);
    setError('');

    try {
      const encrypted = await encryptCredentialData(
        {
          studentId,
          grade,
          personalData: { dateOfBirth, personalEmail }
        },
        {
          address: effectiveWalletAddress,
          contractAddress: effectiveContractAddress
        }
      );

      setEncryptedData(encrypted);
      
      // Notify parent component
      if (onEncrypted) {
        onEncrypted(encrypted);
      }
    } catch (err) {
      console.error('Encryption failed:', err);
      setError(err.message || 'Failed to encrypt data');
    } finally {
      setIsEncrypting(false);
      isProcessingRef.current = false;
    }
  };

  const clearData = () => {
    setStudentId('');
    setGrade('');
    setDateOfBirth('');
    setPersonalEmail('');
    setEncryptedData(null);
    setError('');
    if (onEncrypted) {
      onEncrypted(null);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Show skeleton while initializing
  if (!initialized && hookLoading) {
    return (
      <div className="glass-card p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Initializing encryption module...
          </span>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* FHE Status */}
      <div 
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{ 
          background: isRealFHE ? 'rgba(93, 138, 102, 0.1)' : 'rgba(196, 163, 90, 0.1)',
          border: `1px solid ${isRealFHE ? 'rgba(93, 138, 102, 0.3)' : 'rgba(196, 163, 90, 0.3)'}`
        }}
      >
        <span className="text-lg">{isRealFHE ? '🔐' : '🔓'}</span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {isRealFHE ? 'Inco FHE Active' : 'Simulation Mode'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {isRealFHE 
              ? `Fee: ${fee} ETH on Base Sepolia` 
              : 'Data will be hashed for demo purposes'
            }
          </p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Student ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setEncryptedData(null);
            }}
            placeholder="STU-2024-001"
            disabled={disabled}
            className="glass-input w-full px-4 py-2.5 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Grade / Score
          </label>
          <input
            type="text"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setEncryptedData(null);
            }}
            placeholder="A+ or 95%"
            disabled={disabled}
            className="glass-input w-full px-4 py-2.5 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Date of Birth
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => {
              setDateOfBirth(e.target.value);
              setEncryptedData(null);
            }}
            disabled={disabled}
            className="glass-input w-full px-4 py-2.5 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Personal Email
          </label>
          <input
            type="email"
            value={personalEmail}
            onChange={(e) => {
              setPersonalEmail(e.target.value);
              setEncryptedData(null);
            }}
            placeholder="student@email.com"
            disabled={disabled}
            className="glass-input w-full px-4 py-2.5 rounded-lg"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg" style={{ background: 'rgba(184, 92, 92, 0.1)', border: '1px solid rgba(184, 92, 92, 0.3)' }}>
          <p className="text-sm" style={{ color: '#b85c5c' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Encrypt Button */}
      {!encryptedData && (
        <button
          onClick={handleEncrypt}
          disabled={!hasData || isEncrypting || disabled}
          className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            background: hasData ? 'var(--primary)' : 'var(--bg-tertiary)',
            color: hasData ? 'white' : 'var(--text-tertiary)'
          }}
        >
          {isEncrypting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Encrypting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🔐</span>
              Encrypt Private Data
            </span>
          )}
        </button>
      )}

      {/* Encrypted Data Display */}
      {encryptedData && (
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{ background: 'rgba(93, 138, 102, 0.1)', border: '1px solid rgba(93, 138, 102, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#5d8a66' }}>
                ✅ Data Encrypted Successfully
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#5d8a6620', color: '#5d8a66' }}>
                {encryptedData.isSimulated ? 'Simulated' : 'FHE'}
              </span>
            </div>

            {/* Encrypted Handles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Student ID Handle:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {showFullEncrypted 
                      ? encryptedData.encryptedStudentId 
                      : truncateHash(encryptedData.encryptedStudentId)
                    }
                  </code>
                  <button
                    onClick={() => copyToClipboard(encryptedData.encryptedStudentId)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--primary)', color: 'white' }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Grade Handle:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {showFullEncrypted 
                      ? encryptedData.encryptedGrade 
                      : truncateHash(encryptedData.encryptedGrade)
                    }
                  </code>
                  <button
                    onClick={() => copyToClipboard(encryptedData.encryptedGrade)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--primary)', color: 'white' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFullEncrypted(!showFullEncrypted)}
              className="text-xs underline mt-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {showFullEncrypted ? 'Truncate Hashes' : 'Show Full Hashes'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={clearData}
              className="flex-1 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              Clear & Start Over
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div 
        className="p-3 rounded-lg flex gap-3"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <span>ℹ️</span>
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>About Encrypted Data</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {isRealFHE 
              ? 'Your private data is encrypted using Fully Homomorphic Encryption (FHE). Only authorized parties with your permission can decrypt it.'
              : 'In simulation mode, data is hashed locally. For production FHE, deploy to Base Sepolia with Inco.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
