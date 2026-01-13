/**
 * VeriChain - Hybrid Credential Issuance Page
 * 
 * Issue credentials with optional Inco FHE encrypted private data.
 * Supports both public-only and hybrid (public + private) credentials.
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { preloadIncoModules } from '../utils/inco';

// Lazy load the EncryptedCredentialInput - only loads when user toggles private data
const EncryptedCredentialInput = dynamic(
  () => import('../components/EncryptedCredentialInput'),
  { 
    loading: () => (
      <div className="glass-card p-6 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-3"></div>
        <div className="h-10 bg-gray-200 rounded mb-3"></div>
        <div className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading encryption module...
        </div>
      </div>
    ),
    ssr: false // Don't server-side render this component
  }
);

// Contract ABI for hybrid credentials (minimal)
const HYBRID_CONTRACT_ABI = [
  "function issueCredential(address recipient, string credentialType, string achievementName, string achievementDescription, string metadataURI) external returns (uint256)",
  "function issueCredentialWithPrivateData(address recipient, string credentialType, string achievementName, string achievementDescription, string metadataURI, bytes encryptedStudentId, bytes encryptedGrade, bytes encryptedPersonalData) external returns (uint256)",
  "function authorizedInstitutions(address) external view returns (bool)",
  "event CredentialIssued(uint256 indexed tokenId, address indexed issuer, address indexed recipient, string credentialType, bool hasPrivateData)"
];

export default function IssueHybrid() {
  const { user, isInstitution, isAuthenticated, isDemoUser } = useAuth();
  const router = useRouter();

  // Form state
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [credentialType, setCredentialType] = useState('');
  const [achievementName, setAchievementName] = useState('');
  const [achievementDescription, setAchievementDescription] = useState('');
  
  // Privacy mode
  const [includePrivateData, setIncludePrivateData] = useState(false);
  const [encryptedData, setEncryptedData] = useState(null);
  const [incoPreloaded, setIncoPreloaded] = useState(false);
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [tokenId, setTokenId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isProcessingRef = useRef(false); // Prevent double-clicks

  // Pre-load Inco modules in background on component mount
  useEffect(() => {
    preloadIncoModules().then(() => setIncoPreloaded(true));
  }, []);

  // Contract address (hybrid version)
  const contractAddress = process.env.NEXT_PUBLIC_HYBRID_CONTRACT_ADDRESS || 
                          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
                          '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  // Credential type options
  const credentialTypes = [
    { value: 'diploma', label: '🎓 Diploma' },
    { value: 'certificate', label: '📜 Certificate' },
    { value: 'degree', label: '🎓 Academic Degree' },
    { value: 'license', label: '📋 Professional License' },
    { value: 'badge', label: '🏆 Achievement Badge' },
    { value: 'training', label: '📚 Training Completion' },
    { value: 'award', label: '🥇 Award' },
  ];

  // Check authorization
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isInstitution) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isInstitution, router]);

  const validateForm = () => {
    if (!recipientName.trim()) {
      setError('Recipient name is required');
      return false;
    }
    if (!recipientAddress) {
      setError('Recipient address is required');
      return false;
    }
    // In demo mode, allow demo addresses
    if (!isDemoUser && !ethers.isAddress(recipientAddress)) {
      setError('Invalid Ethereum address');
      return false;
    }
    if (!credentialType) {
      setError('Please select a credential type');
      return false;
    }
    if (!achievementName.trim()) {
      setError('Achievement name is required');
      return false;
    }
    if (includePrivateData && !encryptedData) {
      setError('Please encrypt the private data first');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double-clicks
    if (isProcessingRef.current || isSubmitting) return;
    
    setError('');
    setSuccess(false);

    if (!validateForm()) return;

    isProcessingRef.current = true;
    setIsSubmitting(true);

    try {
      // DEMO MODE: Simulate the transaction
      if (isDemoUser) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate a fake transaction hash and token ID
        const fakeTokenId = Math.floor(Math.random() * 10000) + 1;
        const fakeTxHash = '0xDEMO' + Array(60).fill(0).map(() => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        
        setTxHash(fakeTxHash);
        setTokenId(fakeTokenId.toString());
        
        // Store demo credential in localStorage
        const demoCredentials = JSON.parse(localStorage.getItem('demo_credentials') || '[]');
        demoCredentials.push({
          tokenId: fakeTokenId,
          txHash: fakeTxHash,
          recipient: recipientAddress,
          recipientName,
          credentialType,
          achievementName,
          achievementDescription,
          issuer: user?.displayName || 'Demo Institution',
          issuedAt: new Date().toISOString(),
          hasPrivateData: includePrivateData,
          isDemo: true
        });
        localStorage.setItem('demo_credentials', JSON.stringify(demoCredentials));
        
        setSuccess(true);
        return;
      }

      // REAL MODE: Actual blockchain transaction
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet detected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        contractAddress,
        HYBRID_CONTRACT_ABI,
        signer
      );

      // Check if authorized
      const isAuthorized = await contract.authorizedInstitutions(user?.address);
      if (!isAuthorized) {
        throw new Error('Your institution is not authorized to issue credentials');
      }

      // Create IPFS metadata (simplified - in production, upload to IPFS)
      const metadata = {
        name: achievementName,
        description: achievementDescription,
        recipientName,
        credentialType,
        issuer: user?.address,
        issuedAt: new Date().toISOString(),
        hasPrivateData: includePrivateData
      };
      const metadataURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      let tx;
      
      if (includePrivateData && encryptedData) {
        // Issue with private data
        tx = await contract.issueCredentialWithPrivateData(
          recipientAddress,
          credentialType,
          achievementName,
          achievementDescription || '',
          metadataURI,
          ethers.toUtf8Bytes(encryptedData.encryptedStudentId || ''),
          ethers.toUtf8Bytes(encryptedData.encryptedGrade || ''),
          ethers.toUtf8Bytes(encryptedData.encryptedPersonalData || '')
        );
      } else {
        // Issue standard credential
        tx = await contract.issueCredential(
          recipientAddress,
          credentialType,
          achievementName,
          achievementDescription || '',
          metadataURI
        );
      }

      setTxHash(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Parse token ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        setTokenId(parsed.args[0].toString());
      }

      setSuccess(true);

    } catch (err) {
      console.error('Issuance failed:', err);
      setError(err.reason || err.message || 'Failed to issue credential');
    } finally {
      setIsSubmitting(false);
      isProcessingRef.current = false;
    }
  };

  const resetForm = () => {
    setRecipientName('');
    setRecipientAddress('');
    setCredentialType('');
    setAchievementName('');
    setAchievementDescription('');
    setIncludePrivateData(false);
    setEncryptedData(null);
    setTxHash('');
    setTokenId(null);
    setError('');
    setSuccess(false);
  };

  if (!isAuthenticated || !isInstitution) {
    return (
      <>
        <Head>
          <title>Issue Hybrid Credential | VeriChain</title>
        </Head>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Issue Hybrid Credential | VeriChain</title>
      </Head>
      <Header />
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-3xl mx-auto">
          <BackButton />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Issue Hybrid Credential
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Create a blockchain-verified credential with optional encrypted private data
            </p>
            
            {/* Demo Mode Banner */}
            {isDemoUser && (
              <div 
                className="mt-4 p-3 rounded-lg border flex items-center gap-3"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(196,163,90,0.1), rgba(255,200,87,0.05))',
                  borderColor: 'rgba(196, 163, 90, 0.3)'
                }}
              >
                <span className="text-xl">🎭</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#c4a35a' }}>Demo Mode</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Credentials are simulated. Inco FHE encryption still works!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Success State */}
          {success && (
            <div 
              className="glass-card p-8 rounded-xl mb-8 text-center"
              style={{ borderColor: '#5d8a66' }}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#5d8a66' }}>
                Credential Issued Successfully!
              </h2>
              
              <div className="space-y-4 mt-6 text-left max-w-md mx-auto">
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Token ID</p>
                  <p className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    #{tokenId}
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Transaction Hash</p>
                  <p className="font-mono text-sm break-all" style={{ color: 'var(--text-secondary)' }}>
                    {txHash}
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Credential Type</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {credentialTypes.find(t => t.value === credentialType)?.label || credentialType}
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ 
                  background: includePrivateData ? 'rgba(93, 138, 102, 0.1)' : 'var(--bg-tertiary)'
                }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Privacy Mode</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {includePrivateData ? '🔐 Hybrid (Public + Encrypted)' : '📢 Public Only'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-8 justify-center">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-lg font-medium"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  Issue Another
                </button>
                <button
                  onClick={() => router.push('/credentials/issued')}
                  className="px-6 py-2.5 rounded-lg font-medium"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  View All Credentials
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="glass-card p-6 rounded-xl">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  📋 Credential Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="glass-input w-full px-4 py-2.5 rounded-lg"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Recipient Wallet Address *
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="0x..."
                      className="glass-input w-full px-4 py-2.5 rounded-lg font-mono"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Credential Type *
                    </label>
                    <select
                      value={credentialType}
                      onChange={(e) => setCredentialType(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-lg"
                      disabled={isSubmitting}
                    >
                      <option value="">Select type...</option>
                      {credentialTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Achievement Name *
                    </label>
                    <input
                      type="text"
                      value={achievementName}
                      onChange={(e) => setAchievementName(e.target.value)}
                      placeholder="e.g., Bachelor of Computer Science"
                      className="glass-input w-full px-4 py-2.5 rounded-lg"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Description
                    </label>
                    <textarea
                      value={achievementDescription}
                      onChange={(e) => setAchievementDescription(e.target.value)}
                      placeholder="Describe the achievement..."
                      rows={3}
                      className="glass-input w-full px-4 py-2.5 rounded-lg"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Mode Toggle */}
              <div className="glass-card p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      🔐 Private Data (Optional)
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Encrypt sensitive data using Inco FHE
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIncludePrivateData(!includePrivateData)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includePrivateData ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includePrivateData ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Explanation */}
                {!includePrivateData && (
                  <div 
                    className="p-4 rounded-lg flex gap-3"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <span>ℹ️</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Standard Public Credential
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        All credential data will be publicly visible on the blockchain. This is best for 
                        credentials that need maximum transparency and easy verification.
                      </p>
                    </div>
                  </div>
                )}

                {/* Encrypted Input Fields */}
                {includePrivateData && (
                  <EncryptedCredentialInput
                    onEncrypted={setEncryptedData}
                    walletAddress={user?.address}
                    contractAddress={contractAddress}
                    disabled={isSubmitting}
                  />
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="p-4 rounded-lg flex items-center gap-3"
                  style={{ background: 'rgba(184, 92, 92, 0.1)', border: '1px solid rgba(184, 92, 92, 0.3)' }}
                >
                  <span>⚠️</span>
                  <p className="text-sm" style={{ color: '#b85c5c' }}>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: 'var(--primary)', 
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(85, 88, 121, 0.3)'
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {txHash ? 'Confirming...' : 'Issuing Credential...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🎓</span>
                    Issue {includePrivateData ? 'Hybrid' : 'Public'} Credential
                  </span>
                )}
              </button>

              {/* Transaction Status */}
              {txHash && !success && (
                <div 
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Transaction submitted:
                  </p>
                  <p className="font-mono text-sm break-all mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {txHash}
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="glass-card p-4 rounded-lg">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                📢 Public Credentials
              </h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Fully transparent & verifiable</li>
                <li>• Anyone can verify authenticity</li>
                <li>• Best for diplomas & certificates</li>
              </ul>
            </div>

            <div className="glass-card p-4 rounded-lg">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                🔐 Hybrid Credentials
              </h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Public verification + private data</li>
                <li>• Encrypted with Inco FHE</li>
                <li>• Access controlled by holder</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
