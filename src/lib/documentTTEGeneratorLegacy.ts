/**
 * Legacy TTE Generator using jsPDF
 * Kept for backward compatibility and fallback scenarios
 */
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { DocumentTTEData } from './documentTTEGenerator';

interface QRPositionCoords {
  x: number;
  y: number;
}

/**
 * Generate TTE verification data for QR Code
 */
const generateTTEVerificationData = (data: DocumentTTEData, verifyUrl: string): string => {
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
    verification_id: data.verificationId,
    verify_url: `${verifyUrl}?id=${data.verificationId}`,
  }, null, 2);
};

/**
 * Generate QR Code as base64 data URL
 */
const generateQRCodeForTTE = async (data: string): Promise<string> => {
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
 * Parse custom position string (format: "custom-X-Y" where X,Y are percentages)
 */
const parseCustomPosition = (position: string): { x: number; y: number } | null => {
  if (!position.startsWith('custom-')) return null;
  
  const parts = position.split('-');
  if (parts.length >= 3) {
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    if (!isNaN(x) && !isNaN(y)) {
      return { x, y };
    }
  }
  return null;
};

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
  const customPos = parseCustomPosition(position);
  if (customPos) {
    const x = (customPos.x / 100) * pageWidth - qrSize / 2;
    const y = (customPos.y / 100) * pageHeight - qrSize / 2;
    
    return {
      x: Math.max(margin, Math.min(pageWidth - qrSize - margin, x)),
      y: Math.max(margin, Math.min(pageHeight - qrSize - margin - 20, y)),
    };
  }

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

  const img = new Image();
  img.src = imageDataUrl;
  
  await new Promise((resolve) => {
    img.onload = resolve;
  });

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

  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text('DOKUMEN BERTANDA TANGAN ELEKTRONIK', pageWidth / 2, 15, { align: 'center' });
  
  pdf.setDrawColor(26, 95, 122);
  pdf.setLineWidth(0.5);
  pdf.line(20, 20, pageWidth - 20, 20);

  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.text('Nama Dokumen:', 20, 35);
  pdf.setFontSize(12);
  pdf.text(fileName, 20, 42);

  pdf.setFontSize(14);
  pdf.text('Ditandatangani oleh:', 20, 60);
  pdf.setFontSize(12);
  pdf.text(`${data.signerName}`, 20, 67);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`${data.signerPosition}`, 20, 73);

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

  pdf.setFontSize(9);
  pdf.setTextColor(100);
  const noteY = pageHeight - 60;
  pdf.text('Catatan:', 20, noteY);
  pdf.text('Dokumen ini telah ditandatangani secara elektronik.', 20, noteY + 5);
  pdf.text('Scan QR Code untuk memverifikasi keaslian dokumen.', 20, noteY + 10);
  pdf.text('Dokumen asli tersimpan dalam sistem.', 20, noteY + 15);

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

  const coords = getQRPositionCoords(data.qrPosition, pageWidth, pageHeight, boxWidth);

  pdf.setFillColor(248, 255, 254);
  pdf.setDrawColor(26, 95, 122);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(coords.x, coords.y, boxWidth, boxHeight, 2, 2, 'FD');

  const verificationData = generateTTEVerificationData(data, verifyUrl);
  const qrDataUrl = await generateQRCodeForTTE(verificationData);

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, 'PNG', coords.x + boxPadding, coords.y + boxPadding, qrSize, qrSize);
  }

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

  const hash = btoa(data.documentName + data.signedAt.toISOString())
    .replace(/=/g, '')
    .substring(0, 12)
    .toUpperCase();
  
  pdf.setFontSize(5);
  pdf.setTextColor(26, 95, 122);
  pdf.text(`ID: ${hash}`, textX, textStartY + 25);
};
