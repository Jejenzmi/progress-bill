// QR Code Generator untuk TTE (Tanda Tangan Elektronik)
import QRCode from 'qrcode';

export interface TTEData {
  documentType: 'Invoice' | 'Quotation';
  documentNumber: string;
  documentDate: Date;
  companyName: string;
  clientName: string;
  totalAmount: number;
  signedBy?: string;
  signerPosition?: string;
  signedAt?: Date;
}

/**
 * Generate verification URL for TTE
 * Format: https://verify.company.com/doc/{hash}
 */
export const generateVerificationData = (data: TTEData): string => {
  const timestamp = data.signedAt?.toISOString() || new Date().toISOString();
  const hash = btoa(JSON.stringify({
    type: data.documentType,
    no: data.documentNumber,
    date: data.documentDate.toISOString().split('T')[0],
    company: data.companyName,
    client: data.clientName,
    amount: data.totalAmount,
    signed: timestamp,
  })).replace(/=/g, '');
  
  // Create verification data string
  return JSON.stringify({
    doc: data.documentNumber,
    type: data.documentType,
    date: data.documentDate.toISOString().split('T')[0],
    amount: `Rp ${new Intl.NumberFormat('id-ID').format(data.totalAmount)}`,
    company: data.companyName,
    client: data.clientName,
    signed_at: timestamp,
    hash: hash.substring(0, 16),
  }, null, 2);
};

/**
 * Generate QR Code as base64 data URL
 */
export const generateQRCodeDataURL = async (data: string): Promise<string> => {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 120,
      margin: 1,
      color: {
        dark: '#1a5f7a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

/**
 * Generate TTE section HTML with QR Code
 */
export const generateTTESection = async (data: TTEData): Promise<string> => {
  const verificationData = generateVerificationData(data);
  const qrCodeDataURL = await generateQRCodeDataURL(verificationData);
  const signedAt = data.signedAt || new Date();
  const signerName = data.signedBy || data.companyName;
  const signerPosition = data.signerPosition || '';
  
  return `
    <div class="tte-section">
      <div class="tte-qr">
        ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code TTE" />` : ''}
      </div>
      <div class="tte-info">
        <div class="tte-title">Tanda Tangan Elektronik</div>
        <div class="tte-detail">
          <span class="tte-label">Dokumen:</span>
          <span>${data.documentNumber}</span>
        </div>
        <div class="tte-detail">
          <span class="tte-label">Ditandatangani:</span>
          <span>${new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(signedAt)} WIB</span>
        </div>
        <div class="tte-detail">
          <span class="tte-label">Oleh:</span>
          <span>${signerName}${signerPosition ? ` (${signerPosition})` : ''}</span>
        </div>
        <div class="tte-hash">
          ID: ${btoa(data.documentNumber).substring(0, 16).toUpperCase()}
        </div>
      </div>
    </div>
  `;
};

/**
 * CSS styles for TTE section
 */
export const getTTEStyles = (): string => `
  .tte-section {
    margin-top: 30px;
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 15px;
    background: linear-gradient(135deg, #f8fffe 0%, #f0f9ff 100%);
    border: 1px solid #1a5f7a40;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  .tte-qr {
    flex-shrink: 0;
  }
  .tte-qr img {
    width: 100px;
    height: 100px;
    border: 2px solid #1a5f7a;
    border-radius: 4px;
    padding: 4px;
    background: white;
  }
  .tte-info {
    flex: 1;
  }
  .tte-title {
    font-size: 11pt;
    font-weight: 600;
    color: #1a5f7a;
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1px solid #1a5f7a40;
  }
  .tte-detail {
    font-size: 9pt;
    margin-bottom: 3px;
    display: flex;
    gap: 8px;
  }
  .tte-label {
    color: #666;
    min-width: 100px;
  }
  .tte-hash {
    margin-top: 8px;
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    color: #1a5f7a;
    background: #1a5f7a10;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
  }
`;
