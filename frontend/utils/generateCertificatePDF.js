/**
 * VeriChain Certificate PDF Generator
 * Generates beautiful PDF certificates with QR codes
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Generate a PDF certificate for a credential
 * @param {Object} credential - The credential data
 * @returns {Promise<Blob>} - PDF blob for download
 */
export async function generateCertificatePDF(credential) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Colors from palette
  const colors = {
    primary: [85, 88, 121],      // #555879
    secondary: [152, 161, 188],  // #98A1BC
    accent: [222, 211, 196],     // #DED3C4
    background: [244, 235, 211], // #F4EBD3
    white: [255, 255, 255],
    text: [40, 40, 50]
  };

  // Background
  pdf.setFillColor(...colors.background);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(2);
  pdf.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Inner border
  pdf.setDrawColor(...colors.secondary);
  pdf.setLineWidth(0.5);
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

  // Corner decorations
  const cornerSize = 15;
  pdf.setFillColor(...colors.primary);
  
  // Top-left corner
  pdf.triangle(8, 8, 8 + cornerSize, 8, 8, 8 + cornerSize, 'F');
  // Top-right corner
  pdf.triangle(pageWidth - 8, 8, pageWidth - 8 - cornerSize, 8, pageWidth - 8, 8 + cornerSize, 'F');
  // Bottom-left corner
  pdf.triangle(8, pageHeight - 8, 8 + cornerSize, pageHeight - 8, 8, pageHeight - 8 - cornerSize, 'F');
  // Bottom-right corner
  pdf.triangle(pageWidth - 8, pageHeight - 8, pageWidth - 8 - cornerSize, pageHeight - 8, pageWidth - 8, pageHeight - 8 - cornerSize, 'F');

  // Header accent bar
  pdf.setFillColor(...colors.accent);
  pdf.rect(20, 20, pageWidth - 40, 8, 'F');

  // Logo/Title area
  pdf.setFillColor(...colors.primary);
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VERICHAIN', pageWidth / 2, 26, { align: 'center' });

  // Certificate title
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CERTIFICATE', pageWidth / 2, 50, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.secondary);
  pdf.text('OF ACHIEVEMENT', pageWidth / 2, 58, { align: 'center' });

  // Decorative line
  pdf.setDrawColor(...colors.accent);
  pdf.setLineWidth(1);
  pdf.line(pageWidth / 2 - 50, 65, pageWidth / 2 + 50, 65);

  // "This certifies that" text
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'italic');
  pdf.text('This is to certify that', pageWidth / 2, 78, { align: 'center' });

  // Recipient name
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const recipientName = credential.recipientName || credential.recipient || 'Certificate Holder';
  pdf.text(recipientName, pageWidth / 2, 92, { align: 'center' });

  // Underline for name
  const nameWidth = pdf.getTextWidth(recipientName);
  pdf.setDrawColor(...colors.secondary);
  pdf.setLineWidth(0.3);
  pdf.line(pageWidth / 2 - nameWidth / 2 - 5, 95, pageWidth / 2 + nameWidth / 2 + 5, 95);

  // "has successfully completed" text
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'italic');
  pdf.text('has been awarded the credential', pageWidth / 2, 105, { align: 'center' });

  // Credential title
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const title = credential.title || credential.credentialTitle || 'Achievement Certificate';
  
  // Handle long titles
  if (title.length > 50) {
    const lines = pdf.splitTextToSize(title, pageWidth - 80);
    pdf.text(lines, pageWidth / 2, 118, { align: 'center' });
  } else {
    pdf.text(title, pageWidth / 2, 118, { align: 'center' });
  }

  // Institution info
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Issued by', pageWidth / 2, 132, { align: 'center' });

  pdf.setTextColor(...colors.secondary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const institution = credential.institution || credential.issuer || 'VeriChain Institution';
  pdf.text(institution, pageWidth / 2, 140, { align: 'center' });

  // Date section
  const issueDate = credential.issueDate 
    ? new Date(credential.issueDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  pdf.setTextColor(...colors.text);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Issued on ${issueDate}`, pageWidth / 2, 152, { align: 'center' });

  // Generate QR Code
  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://verichain.app'}/verify/${credential.tokenId || credential.id || '0'}`;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#555879',
        light: '#F4EBD3'
      }
    });
    
    // QR Code position (bottom right)
    const qrSize = 35;
    const qrX = pageWidth - 55;
    const qrY = pageHeight - 55;
    
    // QR Code background
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 2, 2, 'F');
    
    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // QR label
    pdf.setTextColor(...colors.primary);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
  } catch (err) {
    console.error('QR generation failed:', err);
  }

  // Blockchain verification section (bottom left)
  pdf.setFillColor(...colors.white);
  pdf.roundedRect(15, pageHeight - 55, 80, 35, 2, 2, 'F');
  
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BLOCKCHAIN VERIFIED', 20, pageHeight - 46);
  
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  const tokenId = credential.tokenId || credential.id || 'N/A';
  pdf.text(`Token ID: #${tokenId}`, 20, pageHeight - 38);
  
  const contractAddr = credential.contractAddress || '0x5fbdb...180aa3';
  pdf.text(`Contract: ${contractAddr.slice(0, 10)}...${contractAddr.slice(-6)}`, 20, pageHeight - 32);
  
  pdf.text('Network: Ethereum', 20, pageHeight - 26);

  // Signature line
  pdf.setDrawColor(...colors.secondary);
  pdf.setLineWidth(0.3);
  pdf.line(pageWidth / 2 - 40, pageHeight - 35, pageWidth / 2 + 40, pageHeight - 35);
  
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Authorized Signature', pageWidth / 2, pageHeight - 30, { align: 'center' });

  // Footer
  pdf.setFillColor(...colors.accent);
  pdf.rect(20, pageHeight - 20, pageWidth - 40, 8, 'F');
  
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This certificate is cryptographically secured on the blockchain and can be verified at any time.', pageWidth / 2, pageHeight - 15, { align: 'center' });

  // Return as blob
  return pdf.output('blob');
}

/**
 * Download certificate as PDF
 * @param {Object} credential - The credential data
 */
export async function downloadCertificatePDF(credential) {
  try {
    const blob = await generateCertificatePDF(credential);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VeriChain_Certificate_${credential.tokenId || credential.id || 'credential'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download certificate:', err);
    throw err;
  }
}

/**
 * Get PDF as base64 for embedding
 * @param {Object} credential - The credential data
 * @returns {Promise<string>} - Base64 encoded PDF
 */
export async function getCertificatePDFBase64(credential) {
  const pdf = await generateCertificatePDF(credential);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(pdf);
  });
}
