/**
 * PDF Embedder using pdf-lib for direct QR Code embedding into original PDFs
 */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export type QRSize = 'small' | 'medium' | 'large';

export interface QRSizeConfig {
  qrSize: number;
  boxWidth: number;
  boxHeight: number;
  fontSize: {
    title: number;
    body: number;
    small: number;
  };
}

export const QR_SIZES: Record<QRSize, QRSizeConfig> = {
  small: {
    qrSize: 25,
    boxWidth: 60,
    boxHeight: 35,
    fontSize: { title: 5, body: 4, small: 3 },
  },
  medium: {
    qrSize: 35,
    boxWidth: 85,
    boxHeight: 50,
    fontSize: { title: 7, body: 6, small: 5 },
  },
  large: {
    qrSize: 50,
    boxWidth: 120,
    boxHeight: 70,
    fontSize: { title: 9, body: 7, small: 6 },
  },
};

export interface TTEEmbedData {
  documentName: string;
  signerName: string;
  signerPosition: string;
  signedAt: Date;
  qrPosition: string;
  qrSize: QRSize;
  verificationId: string;
}

/**
 * Generate QR Code as PNG bytes for pdf-lib
 */
async function generateQRCodeBytes(data: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(data, {
    width: 300,
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
}

/**
 * Parse custom position string (format: "custom-X-Y" where X,Y are percentages)
 */
function parseCustomPosition(position: string): { x: number; y: number } | null {
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
}

/**
 * Calculate QR position coordinates based on position string
 */
function getQRPositionCoords(
  position: string,
  pageWidth: number,
  pageHeight: number,
  boxWidth: number,
  boxHeight: number,
  margin: number = 15
): { x: number; y: number } {
  const customPos = parseCustomPosition(position);
  
  if (customPos) {
    // pdf-lib uses bottom-left origin, so we need to flip Y
    const x = (customPos.x / 100) * pageWidth - boxWidth / 2;
    const y = pageHeight - (customPos.y / 100) * pageHeight - boxHeight / 2;
    
    return {
      x: Math.max(margin, Math.min(pageWidth - boxWidth - margin, x)),
      y: Math.max(margin, Math.min(pageHeight - boxHeight - margin, y)),
    };
  }

  // Preset positions (pdf-lib uses bottom-left origin)
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
}

/**
 * Generate verification data for QR Code
 */
function generateVerificationData(data: TTEEmbedData, verifyUrl: string): string {
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
}

/**
 * Embed TTE QR Code directly into an existing PDF
 * This modifies the original PDF rather than creating a certificate page
 */
export async function embedTTEIntoPDF(
  pdfBytes: ArrayBuffer | Uint8Array,
  data: TTEEmbedData,
  verifyUrl: string,
  pageNumber: number = 1 // 1-indexed, which page to add QR
): Promise<Uint8Array> {
  // Load the existing PDF without modifying existing content streams
  // This preserves the original quality of the document
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const pages = pdfDoc.getPages();
  
  // Get the target page (default to first page if invalid)
  const targetPageIndex = Math.max(0, Math.min(pageNumber - 1, pages.length - 1));
  const page = pages[targetPageIndex];
  const { width, height } = page.getSize();
  
  // Get size configuration
  const sizeConfig = QR_SIZES[data.qrSize] || QR_SIZES.medium;
  
  // Calculate position
  const coords = getQRPositionCoords(
    data.qrPosition, 
    width, 
    height, 
    sizeConfig.boxWidth, 
    sizeConfig.boxHeight
  );
  
  // Draw TTE box background
  page.drawRectangle({
    x: coords.x,
    y: coords.y,
    width: sizeConfig.boxWidth,
    height: sizeConfig.boxHeight,
    color: rgb(0.97, 1, 0.996), // #f8fffe
    borderColor: rgb(0.102, 0.373, 0.478), // #1a5f7a
    borderWidth: 0.5,
  });
  
  // Generate QR Code
  const verificationData = generateVerificationData(data, verifyUrl);
  const qrBytes = await generateQRCodeBytes(verificationData);
  const qrImage = await pdfDoc.embedPng(qrBytes);
  
  // Draw QR Code
  const qrPadding = 3;
  page.drawImage(qrImage, {
    x: coords.x + qrPadding,
    y: coords.y + sizeConfig.boxHeight - sizeConfig.qrSize - qrPadding,
    width: sizeConfig.qrSize,
    height: sizeConfig.qrSize,
  });
  
  // Embed font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add text info
  const textX = coords.x + sizeConfig.qrSize + qrPadding + 3;
  const textStartY = coords.y + sizeConfig.boxHeight - 8;
  
  // Title
  page.drawText('Tanda Tangan Elektronik', {
    x: textX,
    y: textStartY,
    size: sizeConfig.fontSize.title,
    font: boldFont,
    color: rgb(0.102, 0.373, 0.478),
  });
  
  // Signer info
  const maxTextWidth = sizeConfig.boxWidth - sizeConfig.qrSize - qrPadding - 6;
  const signerNameTruncated = truncateText(data.signerName, font, sizeConfig.fontSize.body, maxTextWidth);
  const signerPosTruncated = truncateText(data.signerPosition, font, sizeConfig.fontSize.small, maxTextWidth);
  
  page.drawText(`Oleh: ${signerNameTruncated}`, {
    x: textX,
    y: textStartY - sizeConfig.fontSize.body - 3,
    size: sizeConfig.fontSize.body,
    font,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  page.drawText(signerPosTruncated, {
    x: textX,
    y: textStartY - sizeConfig.fontSize.body * 2 - 5,
    size: sizeConfig.fontSize.small,
    font,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  // Date
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(data.signedAt);
  
  page.drawText(`Tgl: ${dateStr}`, {
    x: textX,
    y: textStartY - sizeConfig.fontSize.body * 3 - 8,
    size: sizeConfig.fontSize.small,
    font,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  // Verification ID
  page.drawText(`ID: ${data.verificationId}`, {
    x: textX,
    y: coords.y + 4,
    size: sizeConfig.fontSize.small - 1,
    font,
    color: rgb(0.102, 0.373, 0.478),
  });
  
  // Save without additional compression to preserve original quality
  // objectsPerTick: Infinity prevents chunking which can alter byte streams
  return await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: Infinity,
  });
}

/**
 * Truncate text to fit within max width
 */
function truncateText(
  text: string, 
  font: { widthOfTextAtSize: (text: string, size: number) => number }, 
  size: number, 
  maxWidth: number
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '...', size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Convert image to PDF with embedded TTE
 */
export async function embedTTEIntoImage(
  imageBytes: ArrayBuffer | Uint8Array,
  imageType: 'png' | 'jpeg',
  data: TTEEmbedData,
  verifyUrl: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed image
  const image = imageType === 'png' 
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);
  
  // Calculate page size based on image aspect ratio (max A4)
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const imgAspect = image.width / image.height;
  const pageAspect = A4_WIDTH / A4_HEIGHT;
  
  let pageWidth: number, pageHeight: number;
  let imgWidth: number, imgHeight: number;
  let imgX: number, imgY: number;
  
  if (imgAspect > pageAspect) {
    pageWidth = A4_WIDTH;
    pageHeight = A4_HEIGHT;
    imgWidth = pageWidth - 40;
    imgHeight = imgWidth / imgAspect;
    imgX = 20;
    imgY = (pageHeight - imgHeight) / 2;
  } else {
    pageWidth = A4_WIDTH;
    pageHeight = A4_HEIGHT;
    imgHeight = pageHeight - 60;
    imgWidth = imgHeight * imgAspect;
    imgX = (pageWidth - imgWidth) / 2;
    imgY = 30;
  }
  
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Draw image
  page.drawImage(image, {
    x: imgX,
    y: imgY,
    width: imgWidth,
    height: imgHeight,
  });
  
  // Save without compression to preserve image quality
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: Infinity,
  });
  return await embedTTEIntoPDF(pdfBytes, data, verifyUrl, 1);
}

/**
 * Create a certificate PDF for non-image/non-PDF files
 */
export async function createCertificatePDF(
  data: TTEEmbedData,
  verifyUrl: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Header
  page.drawText('DOKUMEN BERTANDA TANGAN ELEKTRONIK', {
    x: width / 2 - 130,
    y: height - 50,
    size: 12,
    font: boldFont,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  // Decorative line
  page.drawLine({
    start: { x: 40, y: height - 70 },
    end: { x: width - 40, y: height - 70 },
    thickness: 1,
    color: rgb(0.102, 0.373, 0.478),
  });
  
  // Document name
  page.drawText('Nama Dokumen:', {
    x: 40,
    y: height - 110,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  page.drawText(data.documentName, {
    x: 40,
    y: height - 130,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  // Signer info
  page.drawText('Ditandatangani oleh:', {
    x: 40,
    y: height - 170,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  page.drawText(data.signerName, {
    x: 40,
    y: height - 190,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(data.signerPosition, {
    x: 40,
    y: height - 208,
    size: 10,
    font,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  // Date
  page.drawText('Tanggal Tanda Tangan:', {
    x: 40,
    y: height - 250,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.signedAt) + ' WIB';
  
  page.drawText(dateStr, {
    x: 40,
    y: height - 270,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  // Notes
  page.drawText('Catatan:', {
    x: 40,
    y: 120,
    size: 9,
    font: boldFont,
    color: rgb(0.314, 0.314, 0.314),
  });
  
  const notes = [
    'Dokumen ini telah ditandatangani secara elektronik.',
    'Scan QR Code untuk memverifikasi keaslian dokumen.',
    'Dokumen asli tersimpan dalam sistem.',
  ];
  
  notes.forEach((note, i) => {
    page.drawText(note, {
      x: 40,
      y: 105 - i * 12,
      size: 9,
      font,
      color: rgb(0.314, 0.314, 0.314),
    });
  });
  
  // Embed TTE QR Code - save without compression
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: Infinity,
  });
  return await embedTTEIntoPDF(pdfBytes, data, verifyUrl, 1);
}
