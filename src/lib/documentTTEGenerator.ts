import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { 
  embedTTEIntoPDF, 
  embedTTEIntoImage, 
  createCertificatePDF, 
  TTEEmbedData, 
  QRSize 
} from './pdfEmbedder';

export interface DocumentTTEData {
  documentName: string;
  signerName: string;
  signerPosition: string;
  signedAt: Date;
  qrPosition: string;
  qrSize?: QRSize;
  verificationId?: string;
  pageNumber?: number; // 1-indexed page number for multi-page PDFs
}

/**
 * Generate a unique verification ID for the document
 */
export const generateVerificationId = (data: DocumentTTEData): string => {
  const timestamp = data.signedAt.getTime().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const hash = btoa(JSON.stringify({
    doc: data.documentName,
    signer: data.signerName,
    ts: timestamp,
  })).replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
  
  return `${hash}${random}`.toUpperCase().substring(0, 12);
};

/**
 * Generate TTE verification data for QR Code
 */
export const generateTTEVerificationData = (data: DocumentTTEData, verifyUrl: string): string => {
  const verificationId = data.verificationId || generateVerificationId(data);
  
  return JSON.stringify({
    document: data.documentName,
    signer: data.signerName,
    position: data.signerPosition,
    signed_at: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data.signedAt) + ' WIB',
    verification_id: verificationId,
    verify_url: `${verifyUrl}?id=${verificationId}`,
  }, null, 2);
};

/**
 * Generate QR Code as base64 data URL
 */
export const generateQRCodeForTTE = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      width: 150,
      margin: 1,
      color: {
        dark: '#1a5f7a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

/**
 * Parse QR position and extract size
 */
const parsePositionWithSize = (position: string): { position: string; size: QRSize } => {
  // Format: "position-size" e.g. "bottom-right-medium" or "custom-50-50-large"
  const sizeMatch = position.match(/-(small|medium|large)$/);
  if (sizeMatch) {
    return {
      position: position.replace(`-${sizeMatch[1]}`, ''),
      size: sizeMatch[1] as QRSize,
    };
  }
  return { position, size: 'medium' };
};

/**
 * Result from generateSignedPDF containing both the blob and verification ID
 */
export interface SignedPDFResult {
  blob: Blob;
  verificationId: string;
}

/**
 * Main function to generate signed PDF from any file
 * Uses pdf-lib for direct PDF embedding when the source is PDF
 */
export const generateSignedPDF = async (
  file: File,
  tteData: DocumentTTEData,
  verifyUrl: string = ''
): Promise<SignedPDFResult> => {
  const fileType = file.type;
  
  // Generate verification ID if not provided
  const verificationId = tteData.verificationId || generateVerificationId(tteData);
  
  // Parse position and size
  const { position, size } = parsePositionWithSize(tteData.qrPosition);
  const qrSize = tteData.qrSize || size;
  
  const embedData: TTEEmbedData = {
    documentName: tteData.documentName,
    signerName: tteData.signerName,
    signerPosition: tteData.signerPosition,
    signedAt: tteData.signedAt,
    qrPosition: position,
    qrSize,
    verificationId,
  };

  let resultBytes: Uint8Array;

  if (fileType === 'application/pdf') {
    // Handle PDF files - embed TTE directly into original PDF
    const pdfBytes = await file.arrayBuffer();
    const pageNumber = tteData.pageNumber || 1;
    resultBytes = await embedTTEIntoPDF(pdfBytes, embedData, verifyUrl, pageNumber);
  } else if (fileType.startsWith('image/')) {
    // Handle image files - convert to PDF with embedded TTE
    const imageBytes = await file.arrayBuffer();
    const imageType = fileType.includes('png') ? 'png' : 'jpeg';
    resultBytes = await embedTTEIntoImage(imageBytes, imageType, embedData, verifyUrl);
  } else {
    // For other document types, create a certificate page
    resultBytes = await createCertificatePDF(embedData, verifyUrl);
  }

  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' });
  return { blob, verificationId };
};

/**
 * Helper to read file as data URL
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Legacy exports for backward compatibility
export { 
  generatePDFWithTTEFromImage, 
  generatePDFWithTTEForDocument,
  addTTEQRCodeToPDF,
} from './documentTTEGeneratorLegacy';
