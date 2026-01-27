import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export type QRSize = 'small' | 'medium' | 'large';

export interface DocumentTTEData {
  documentName: string;
  signerName: string;
  signerPosition: string;
  signedAt: Date;
  qrPosition: string;
  qrSize?: QRSize;
  verificationId?: string;
}

// QR Size configurations in mm (will be converted to points)
const QR_SIZES: Record<QRSize, { qrSize: number; boxWidth: number; boxHeight: number; fontSize: number }> = {
  small: { qrSize: 25, boxWidth: 65, boxHeight: 35, fontSize: 5 },
  medium: { qrSize: 35, boxWidth: 85, boxHeight: 50, fontSize: 6 },
  large: { qrSize: 50, boxWidth: 110, boxHeight: 65, fontSize: 7 },
};

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
 * Generate QR Code as PNG bytes
 */
export const generateQRCodeBytes = async (data: string, size: number = 150): Promise<Uint8Array> => {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: {
        dark: '#1a5f7a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    
    // Convert data URL to bytes
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

interface QRPositionCoords {
  x: number;
  y: number;
}

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
 * Returns coordinates in PDF points (bottom-left origin)
 */
const getQRPositionCoords = (
  position: string,
  pageWidth: number,
  pageHeight: number,
  boxWidth: number,
  boxHeight: number,
  margin: number = 20
): QRPositionCoords => {
  // Check for custom position first
  const customPos = parseCustomPosition(position);
  if (customPos) {
    // Convert percentage to actual coordinates
    // Note: PDF coordinates are from bottom-left, but our percentages are from top-left
    const x = (customPos.x / 100) * pageWidth - boxWidth / 2;
    const y = pageHeight - (customPos.y / 100) * pageHeight - boxHeight / 2;
    
    // Clamp to page bounds
    return {
      x: Math.max(margin, Math.min(pageWidth - boxWidth - margin, x)),
      y: Math.max(margin, Math.min(pageHeight - boxHeight - margin, y)),
    };
  }

  // Preset positions (PDF coordinates are from bottom-left)
  switch (position) {
    case 'top-left':
      return { x: margin, y: pageHeight - boxHeight - margin };
    case 'top-right':
      return { x: pageWidth - boxWidth - margin, y: pageHeight - boxHeight - margin };
    case 'bottom-left':
      return { x: margin, y: margin };
    case 'bottom-right':
      return { x: pageWidth - boxWidth - margin, y: margin };
    case 'center':
      return { 
        x: (pageWidth - boxWidth) / 2, 
        y: (pageHeight - boxHeight) / 2 
      };
    default:
      return { x: pageWidth - boxWidth - margin, y: margin };
  }
};

/**
 * Add TTE QR Code directly to an existing PDF using pdf-lib
 */
export const embedTTEIntoPDF = async (
  pdfBytes: ArrayBuffer,
  data: DocumentTTEData,
  verifyUrl: string = '',
  targetPage: number = 0 // 0 = last page, positive = specific page (1-indexed)
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // Determine which page to add TTE
  let pageIndex = pages.length - 1; // default to last page
  if (targetPage > 0 && targetPage <= pages.length) {
    pageIndex = targetPage - 1;
  }
  
  const page = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();
  
  // Get size configuration
  const sizeConfig = QR_SIZES[data.qrSize || 'medium'];
  const mmToPoints = 2.83465; // 1mm = 2.83465 points
  
  const qrSize = sizeConfig.qrSize * mmToPoints;
  const boxWidth = sizeConfig.boxWidth * mmToPoints;
  const boxHeight = sizeConfig.boxHeight * mmToPoints;
  const boxPadding = 5 * mmToPoints;
  
  // Get QR position
  const coords = getQRPositionCoords(data.qrPosition, pageWidth, pageHeight, boxWidth, boxHeight);
  
  // Draw TTE box background
  page.drawRectangle({
    x: coords.x,
    y: coords.y,
    width: boxWidth,
    height: boxHeight,
    color: rgb(0.97, 1, 0.996), // Light teal background
    borderColor: rgb(0.102, 0.373, 0.478), // Teal border
    borderWidth: 1,
  });
  
  // Generate and embed QR Code
  const verificationData = generateTTEVerificationData(data, verifyUrl);
  const qrBytes = await generateQRCodeBytes(verificationData, 200);
  const qrImage = await pdfDoc.embedPng(qrBytes);
  
  page.drawImage(qrImage, {
    x: coords.x + boxPadding,
    y: coords.y + boxHeight - qrSize - boxPadding,
    width: qrSize,
    height: qrSize,
  });
  
  // Add text info
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = sizeConfig.fontSize;
  const textX = coords.x + qrSize + boxPadding * 2;
  let textY = coords.y + boxHeight - boxPadding - fontSize;
  
  const tealColor = rgb(0.102, 0.373, 0.478);
  const grayColor = rgb(0.314, 0.314, 0.314);
  
  // Title
  page.drawText('Tanda Tangan Elektronik', {
    x: textX,
    y: textY,
    size: fontSize + 1,
    font: boldFont,
    color: tealColor,
  });
  
  textY -= fontSize * 1.8;
  
  // Signer name
  const truncatedName = data.signerName.length > 20 
    ? data.signerName.substring(0, 20) + '...' 
    : data.signerName;
  page.drawText(`Oleh: ${truncatedName}`, {
    x: textX,
    y: textY,
    size: fontSize,
    font: font,
    color: grayColor,
  });
  
  textY -= fontSize * 1.5;
  
  // Position
  const truncatedPosition = data.signerPosition.length > 25 
    ? data.signerPosition.substring(0, 25) + '...' 
    : data.signerPosition;
  page.drawText(truncatedPosition, {
    x: textX,
    y: textY,
    size: fontSize - 0.5,
    font: font,
    color: grayColor,
  });
  
  textY -= fontSize * 1.8;
  
  // Date
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(data.signedAt);
  page.drawText(`Tgl: ${dateStr}`, {
    x: textX,
    y: textY,
    size: fontSize,
    font: font,
    color: grayColor,
  });
  
  textY -= fontSize * 1.8;
  
  // Verification ID
  page.drawText(`ID: ${data.verificationId}`, {
    x: textX,
    y: textY,
    size: fontSize - 1,
    font: font,
    color: tealColor,
  });
  
  return pdfDoc.save();
};

/**
 * Convert image to PDF with TTE embedded
 */
export const imageToSignedPDF = async (
  imageBytes: ArrayBuffer,
  imageType: 'png' | 'jpg',
  data: DocumentTTEData,
  verifyUrl: string = ''
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  // Embed image
  let image;
  if (imageType === 'png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }
  
  // Calculate page size to fit image (A4 max)
  const a4Width = 595.28; // A4 width in points
  const a4Height = 841.89; // A4 height in points
  const margin = 40;
  
  const imgWidth = image.width;
  const imgHeight = image.height;
  const imgRatio = imgWidth / imgHeight;
  
  let pageWidth = a4Width;
  let pageHeight = a4Height;
  let drawWidth = a4Width - margin * 2;
  let drawHeight = drawWidth / imgRatio;
  
  if (drawHeight > a4Height - margin * 2) {
    drawHeight = a4Height - margin * 2;
    drawWidth = drawHeight * imgRatio;
  }
  
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Center image on page
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;
  
  page.drawImage(image, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });
  
  // Get PDF bytes and add TTE
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return embedTTEIntoPDF(pdfBuffer as ArrayBuffer, data, verifyUrl);
};

/**
 * Create a certificate PDF for non-image/non-PDF files
 */
export const createCertificatePDF = async (
  fileName: string,
  data: DocumentTTEData,
  verifyUrl: string = ''
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const tealColor = rgb(0.102, 0.373, 0.478);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const blackColor = rgb(0, 0, 0);
  
  // Header
  page.drawText('DOKUMEN BERTANDA TANGAN ELEKTRONIK', {
    x: width / 2 - 140,
    y: height - 60,
    size: 14,
    font: boldFont,
    color: tealColor,
  });
  
  // Decorative line
  page.drawLine({
    start: { x: 50, y: height - 80 },
    end: { x: width - 50, y: height - 80 },
    thickness: 1,
    color: tealColor,
  });
  
  let yPos = height - 130;
  
  // Document name
  page.drawText('Nama Dokumen:', { x: 50, y: yPos, size: 12, font: boldFont, color: blackColor });
  yPos -= 20;
  page.drawText(fileName, { x: 50, y: yPos, size: 11, font: font, color: grayColor });
  
  yPos -= 50;
  
  // Signer info
  page.drawText('Ditandatangani oleh:', { x: 50, y: yPos, size: 12, font: boldFont, color: blackColor });
  yPos -= 20;
  page.drawText(data.signerName, { x: 50, y: yPos, size: 11, font: font, color: blackColor });
  yPos -= 15;
  page.drawText(data.signerPosition, { x: 50, y: yPos, size: 10, font: font, color: grayColor });
  
  yPos -= 50;
  
  // Date info
  page.drawText('Tanggal Tanda Tangan:', { x: 50, y: yPos, size: 12, font: boldFont, color: blackColor });
  yPos -= 20;
  const fullDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.signedAt) + ' WIB';
  page.drawText(fullDate, { x: 50, y: yPos, size: 11, font: font, color: grayColor });
  
  // Notes at bottom
  const noteY = 100;
  page.drawText('Catatan:', { x: 50, y: noteY, size: 9, font: boldFont, color: grayColor });
  page.drawText('• Dokumen ini telah ditandatangani secara elektronik.', { x: 50, y: noteY - 15, size: 8, font: font, color: grayColor });
  page.drawText('• Scan QR Code untuk memverifikasi keaslian dokumen.', { x: 50, y: noteY - 27, size: 8, font: font, color: grayColor });
  page.drawText('• Dokumen asli tersimpan dalam sistem.', { x: 50, y: noteY - 39, size: 8, font: font, color: grayColor });
  
  // Get PDF bytes and add TTE
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return embedTTEIntoPDF(pdfBuffer as ArrayBuffer, data, verifyUrl);
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
 * Now embeds TTE directly into original PDF using pdf-lib
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
  
  let pdfBytes: Uint8Array;
  
  if (fileType === 'application/pdf') {
    // For PDF files, embed TTE directly into the original PDF
    const arrayBuffer = await file.arrayBuffer();
    pdfBytes = await embedTTEIntoPDF(arrayBuffer, dataWithId, verifyUrl);
  } else if (fileType.startsWith('image/')) {
    // For image files, create PDF with image and TTE
    const arrayBuffer = await file.arrayBuffer();
    const imageType = fileType.includes('png') ? 'png' : 'jpg';
    pdfBytes = await imageToSignedPDF(arrayBuffer, imageType, dataWithId, verifyUrl);
  } else {
    // For other document types, create a certificate page
    pdfBytes = await createCertificatePDF(file.name, dataWithId, verifyUrl);
  }
  
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  return { blob, verificationId };
};

/**
 * Helper to read file as ArrayBuffer
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
