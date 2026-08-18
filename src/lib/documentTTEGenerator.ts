import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface DocumentTTEData {
  documentName: string;
  signerName: string;
  signerPosition: string;
  signedAt: Date;
  qrPosition: string;
  verificationId?: string;
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

interface QRPositionCoords {
  x: number;
  y: number;
}

/**
 * Calculate QR position coordinates based on position string
 */
const getQRPositionCoords = (
  position: string,
  pageWidth: number,
  pageHeight: number,
  qrSize: number,
  margin: number = 15
): QRPositionCoords => {
  switch (position) {
    case 'top-left':
      return { x: margin, y: margin };
    case 'top-right':
      return { x: pageWidth - qrSize - margin, y: margin };
    case 'bottom-left':
      return { x: margin, y: pageHeight - qrSize - margin - 30 };
    case 'bottom-right':
      return { x: pageWidth - qrSize - margin, y: pageHeight - qrSize - margin - 30 };
    case 'center':
      return { 
        x: (pageWidth - qrSize) / 2, 
        y: (pageHeight - qrSize) / 2 
      };
    default:
      return { x: pageWidth - qrSize - margin, y: pageHeight - qrSize - margin - 30 };
  }
};

/**
 * Generate a PDF with TTE QR Code from an image file
 */
export const generatePDFWithTTEFromImage = async (
  imageDataUrl: string,
  data: DocumentTTEData,
  verifyUrl: string = ''
): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add image to PDF
  const img = new Image();
  img.src = imageDataUrl;
  
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  // Calculate image dimensions to fit page
  const imgRatio = img.width / img.height;
  const pageRatio = pageWidth / pageHeight;
  
  let imgWidth: number;
  let imgHeight: number;
  let imgX: number;
  let imgY: number;

  if (imgRatio > pageRatio) {
    imgWidth = pageWidth - 20;
    imgHeight = imgWidth / imgRatio;
    imgX = 10;
    imgY = (pageHeight - imgHeight) / 2;
  } else {
    imgHeight = pageHeight - 60;
    imgWidth = imgHeight * imgRatio;
    imgX = (pageWidth - imgWidth) / 2;
    imgY = 10;
  }

  pdf.addImage(imageDataUrl, 'JPEG', imgX, imgY, imgWidth, imgHeight);

  // Generate and add QR Code
  await addTTEQRCodeToPDF(pdf, data, verifyUrl);

  return pdf.output('blob');
};

/**
 * Generate a new PDF document with TTE for non-PDF files
 */
export const generatePDFWithTTEForDocument = async (
  fileName: string,
  data: DocumentTTEData,
  verifyUrl: string = ''
): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add document info header
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text('DOKUMEN BERTANDA TANGAN ELEKTRONIK', pageWidth / 2, 15, { align: 'center' });
  
  // Draw decorative line
  pdf.setDrawColor(26, 95, 122);
  pdf.setLineWidth(0.5);
  pdf.line(20, 20, pageWidth - 20, 20);

  // Document name
  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.text('Nama Dokumen:', 20, 35);
  pdf.setFontSize(12);
  pdf.text(fileName, 20, 42);

  // Signer info
  pdf.setFontSize(14);
  pdf.text('Ditandatangani oleh:', 20, 60);
  pdf.setFontSize(12);
  pdf.text(`${data.signerName}`, 20, 67);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`${data.signerPosition}`, 20, 73);

  // Date info
  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.text('Tanggal Tanda Tangan:', 20, 90);
  pdf.setFontSize(12);
  pdf.text(
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data.signedAt) + ' WIB',
    20,
    97
  );

  // Add note
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  const noteY = pageHeight - 60;
  pdf.text('Catatan:', 20, noteY);
  pdf.text('Dokumen ini telah ditandatangani secara elektronik.', 20, noteY + 5);
  pdf.text('Scan QR Code untuk memverifikasi keaslian dokumen.', 20, noteY + 10);
  pdf.text('Dokumen asli tersimpan dalam sistem.', 20, noteY + 15);

  // Generate and add QR Code
  await addTTEQRCodeToPDF(pdf, data, verifyUrl);

  return pdf.output('blob');
};

/**
 * Add TTE QR Code to existing PDF
 */
export const addTTEQRCodeToPDF = async (
  pdf: jsPDF,
  data: DocumentTTEData,
  verifyUrl: string = ''
): Promise<void> => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const qrSize = 35;
  const boxPadding = 5;
  const boxWidth = qrSize + 50;
  const boxHeight = qrSize + 15;

  // Get QR position
  const coords = getQRPositionCoords(data.qrPosition, pageWidth, pageHeight, boxWidth);

  // Draw TTE box background
  pdf.setFillColor(248, 255, 254);
  pdf.setDrawColor(26, 95, 122);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(coords.x, coords.y, boxWidth, boxHeight, 2, 2, 'FD');

  // Generate QR Code
  const verificationData = generateTTEVerificationData(data, verifyUrl);
  const qrDataUrl = await generateQRCodeForTTE(verificationData);

  if (qrDataUrl) {
    // Add QR Code image
    pdf.addImage(qrDataUrl, 'PNG', coords.x + boxPadding, coords.y + boxPadding, qrSize, qrSize);
  }

  // Add TTE text info
  const textX = coords.x + qrSize + boxPadding + 3;
  const textStartY = coords.y + 8;

  pdf.setFontSize(7);
  pdf.setTextColor(26, 95, 122);
  pdf.text('Tanda Tangan Elektronik', textX, textStartY);

  pdf.setFontSize(6);
  pdf.setTextColor(80);
  pdf.text(`Oleh: ${data.signerName}`, textX, textStartY + 5);
  pdf.text(`${data.signerPosition}`, textX, textStartY + 9);
  
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(data.signedAt);
  pdf.text(`Tgl: ${dateStr}`, textX, textStartY + 15);

  // Verification ID
  const hash = btoa(data.documentName + data.signedAt.toISOString())
    .replace(/=/g, '')
    .substring(0, 12)
    .toUpperCase();
  
  pdf.setFontSize(5);
  pdf.setTextColor(26, 95, 122);
  pdf.text(`ID: ${hash}`, textX, textStartY + 25);
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
 */
export const generateSignedPDF = async (
  file: File,
  tteData: DocumentTTEData,
  verifyUrl: string = ''
): Promise<SignedPDFResult> => {
  const fileType = file.type;
  
  // Generate verification ID if not provided
  const verificationId = tteData.verificationId || generateVerificationId(tteData);
  const dataWithId = { ...tteData, verificationId };

  let blob: Blob;

  if (fileType.startsWith('image/')) {
    // Handle image files
    const imageDataUrl = await readFileAsDataURL(file);
    blob = await generatePDFWithTTEFromImage(imageDataUrl, dataWithId, verifyUrl);
  } else if (fileType === 'application/pdf') {
    // Keep ALL original pages, stamp the TTE QR onto the last page
    blob = await stampTTEOnExistingPDF(file, dataWithId, verifyUrl);
  } else {
    // For other document types, create a certificate page
    blob = await generatePDFWithTTEForDocument(file.name, dataWithId, verifyUrl);
  }

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
