// Quotation PDF Generator untuk format PT Zen Multimedia Indonesia

import { generateTTESection, getTTEStyles, TTEData, generateQRCodeDataURL } from './qrCodeGenerator';

export interface TTESettings {
  signer_name: string;
  signer_position: string;
  enabled: boolean;
}

export interface CompanyProfile {
  name: string;
  npwp: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bank_info: string;
  logo_url?: string;
}

export interface QuotationItem {
  item: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuotationData {
  quotationNumber: string;
  quotationDate: Date;
  validUntil: Date;
  clientName: string;
  clientAddress: string;
  projectName: string;
  projectDescription?: string;
  items: QuotationItem[];
  subtotal: number;
  ppnPercentage: number;
  ppnAmount: number;
  grandTotal: number;
  paymentTerms?: string[];
  estimatedDuration?: string;
  guaranteeTerms?: string[];
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyPlain = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

// Konversi angka ke terbilang dalam bahasa Indonesia
export const numberToWords = (num: number): string => {
  const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  const convert = (n: number): string => {
    if (n < 12) return ones[n];
    if (n < 20) return ones[n - 10] + ' Belas';
    if (n < 100) return ones[Math.floor(n / 10)] + ' Puluh' + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
    if (n < 200) return 'Seratus' + (n % 100 > 0 ? ' ' + convert(n % 100) : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Ratus' + (n % 100 > 0 ? ' ' + convert(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 > 0 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 > 0 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 > 0 ? ' ' + convert(n % 1000000) : '');
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + ' Milyar' + (n % 1000000000 > 0 ? ' ' + convert(n % 1000000000) : '');
    return convert(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 > 0 ? ' ' + convert(n % 1000000000000) : '');
  };
  
  if (num === 0) return 'Nol Rupiah';
  return convert(num) + ' Rupiah';
};

export const generateQuotationPDF = async (
  quotation: QuotationData,
  company: CompanyProfile,
  tteSettings?: TTESettings
): Promise<string> => {
  // Generate TTE data
  const tteData: TTEData = {
    documentType: 'Quotation',
    documentNumber: quotation.quotationNumber,
    documentDate: quotation.quotationDate,
    companyName: company.name,
    clientName: quotation.clientName,
    totalAmount: quotation.grandTotal,
    signedBy: tteSettings?.signer_name || undefined,
    signerPosition: tteSettings?.signer_position || undefined,
    signedAt: new Date(),
  };
  
  const tteEnabled = tteSettings?.enabled !== false;
  const signedAt = new Date();
  const verificationId = btoa(quotation.quotationNumber).substring(0, 16).toUpperCase();
  
  // Get the published URL for verification (use production custom domain)
  const publishedUrl = 'https://crm.zefin.id';
  const verificationUrl = `${publishedUrl}/verify?id=${verificationId}`;
  
  // Generate QR Code for TTE - QR code contains ONLY the URL for direct redirect
  let qrCodeDataURL = '';
  if (tteEnabled) {
    qrCodeDataURL = await generateQRCodeDataURL(verificationUrl);
  }
  
  const itemRows = quotation.items.map((item) => `
    <tr>
      <td class="item-cell">
        <div>${item.item}</div>
        ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
      </td>
      <td class="center-cell">${item.quantity}</td>
      <td class="center-cell">${item.unit}</td>
      <td class="right-cell">Rp. ${formatCurrencyPlain(item.unitPrice)}</td>
      <td class="right-cell">Rp. ${formatCurrencyPlain(item.total)},-</td>
    </tr>
  `).join('');

  const paymentTermsHTML = quotation.paymentTerms?.map((term) => `
    <li>${term}</li>
  `).join('') || '';

  const guaranteeHTML = quotation.guaranteeTerms?.map((term) => `
    <li>${term}</li>
  `).join('') || '';

  // Always use a reliable logo for print window:
  // 1) try custom logo_url (if accessible)
  // 2) fallback to local /zen-logo-quotation.png
  const toDataUrl = async (url?: string): Promise<string | null> => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  const logoLocalPath = '/zen-logo-quotation.png';
  let logoSrc = (await toDataUrl(company.logo_url)) || (await toDataUrl(logoLocalPath)) || logoLocalPath;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Quotation - ${quotation.quotationNumber}</title>
      <style>
        @page { 
          size: A4; 
          margin: 15mm 15mm 20mm 15mm; 
        }
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          color: #333; 
          font-size: 9pt;
          line-height: 1.4;
          background: white;
        }
        
        /* Header */
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 10px 0 15px 0;
          margin-bottom: 10px;
        }
        .header-pattern {
          width: 180px;
          height: 100px;
          background: radial-gradient(circle, #3d5a80 2px, transparent 2px);
          background-size: 10px 10px;
          mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 60%, transparent 100%),
                      linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 60%, transparent 100%),
                              linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, transparent 100%);
          mask-composite: intersect;
          -webkit-mask-composite: source-in;
          flex-shrink: 0;
        }
        .header-info {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: right;
        }
        .header-logo {
          height: 60px;
          width: auto;
          max-width: 280px;
        }
        .company-name {
          font-size: 13pt;
          font-weight: bold;
          color: #3d5a80;
          letter-spacing: 0.3px;
          line-height: 1.2;
        }
        
        /* Content */
        .content {
          padding: 0;
        }
        .title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          color: #3d5a80;
          margin: 10px 0 15px;
          letter-spacing: 3px;
        }
        
        /* Meta Grid */
        .meta-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .meta-left {
          font-size: 9pt;
        }
        .meta-row {
          display: flex;
          margin-bottom: 2px;
        }
        .meta-label {
          width: 70px;
          color: #666;
        }
        .meta-value {
          font-weight: 500;
        }
        .valid-badge {
          background: #fff3cd;
          color: #856404;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: 500;
          align-self: flex-start;
        }
        
        /* Section */
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          color: #3d5a80;
          margin: 12px 0 6px;
          padding-bottom: 3px;
          border-bottom: 2px solid #3d5a80;
        }
        .project-title {
          font-size: 11pt;
          font-weight: bold;
          color: #333;
          text-align: center;
          background: #e8f0f5;
          padding: 8px;
          border-radius: 4px;
          margin: 10px 0;
        }
        
        /* Table */
        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin: 8px 0;
        }
        .table th {
          background: #3d5a80;
          color: white;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #3d5a80;
        }
        .table th.center { text-align: center; }
        .table th.right { text-align: right; }
        .table td {
          padding: 5px 8px;
          border: 1px solid #ddd;
          vertical-align: top;
        }
        .item-cell { width: 38%; }
        .item-description {
          font-size: 7pt;
          color: #666;
          font-style: italic;
          margin-top: 2px;
          line-height: 1.3;
        }
        .center-cell { text-align: center; }
        .right-cell { text-align: right; }
        
        /* Prevent table rows from breaking across pages */
        .table tr {
          page-break-inside: avoid;
        }
        
        /* Totals */
        .totals-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .totals-box {
          width: 280px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 8px;
          font-size: 9pt;
        }
        .total-row.subtotal {
          border-bottom: 1px solid #e0e0e0;
        }
        .total-row.ppn {
          color: #666;
        }
        .total-row.grand {
          background: #3d5a80;
          color: white;
          font-weight: bold;
          border-radius: 4px;
          margin-top: 4px;
        }
        
        /* Terbilang */
        .terbilang {
          background: #f5f8fa;
          padding: 6px 10px;
          margin-top: 8px;
          border-radius: 4px;
          font-style: italic;
          border-left: 3px solid #3d5a80;
          font-size: 8pt;
        }
        
        /* Terms */
        .terms-list {
          list-style: none;
          padding-left: 0;
          font-size: 8pt;
          margin: 4px 0;
        }
        .terms-list li {
          padding-left: 12px;
          position: relative;
          margin-bottom: 2px;
        }
        .terms-list li::before {
          content: "•";
          color: #3d5a80;
          font-weight: bold;
          position: absolute;
          left: 0;
        }
        
        /* Signature Section - TTE integrated */
        .signature-section {
          margin-top: 15px;
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-box p {
          font-size: 9pt;
        }
        .signature-qr {
          margin-top: 10px;
          display: flex;
          justify-content: center;
        }
        .signature-qr img {
          width: 70px;
          height: 70px;
          border: 1px solid #3d5a80;
          border-radius: 4px;
          padding: 2px;
          background: white;
        }
        .signer-name {
          font-weight: bold;
          margin-top: 12px;
          padding-top: 5px;
          border-top: 1px solid #333;
        }
        .signer-position {
          font-size: 8pt;
          color: #666;
        }
        
        /* TTE Section */
        .tte-section {
          margin-top: 15px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          background: linear-gradient(135deg, #f8fffe 0%, #f0f9ff 100%);
          border: 1px solid #3d5a8040;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        .tte-qr {
          flex-shrink: 0;
        }
        .tte-qr img {
          width: 70px;
          height: 70px;
          border: 1px solid #3d5a80;
          border-radius: 4px;
          padding: 2px;
          background: white;
        }
        .tte-info {
          flex: 1;
        }
        .tte-title {
          font-size: 9pt;
          font-weight: 600;
          color: #3d5a80;
          margin-bottom: 4px;
          padding-bottom: 3px;
          border-bottom: 1px solid #3d5a8040;
        }
        .tte-detail {
          font-size: 8pt;
          margin-bottom: 2px;
          display: flex;
          gap: 6px;
        }
        .tte-label {
          color: #666;
          min-width: 80px;
        }
        .tte-hash {
          margin-top: 4px;
          font-family: 'Courier New', monospace;
          font-size: 7pt;
          color: #3d5a80;
          background: #3d5a8015;
          padding: 2px 6px;
          border-radius: 3px;
          display: inline-block;
        }
        
        /* Footer - now inline at bottom of content */
        .footer {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 4px solid #2c3e50;
          page-break-inside: avoid;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .footer-contact {
          font-size: 6pt;
          color: #333;
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }
        .footer-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .footer-row svg {
          width: 8px;
          height: 8px;
          fill: #3d5a80;
          flex-shrink: 0;
        }
        .footer-decoration {
          width: 80px;
          height: 60px;
          background: linear-gradient(135deg, #6b8cae 0%, #3d5a80 100%);
          border-radius: 100% 0 0 0;
          position: relative;
          overflow: hidden;
        }
        .footer-decoration::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px);
          background-size: 6px 6px;
        }
        
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-pattern"></div>
        <div class="header-info">
          <img src="${logoSrc}" alt="PT. Zen Multimedia Indonesia" class="header-logo" />
        </div>
      </div>

      <!-- Content -->
      <div class="content">
        <h1 class="title">QUOTATION</h1>

        <!-- Meta Info -->
        <div class="meta-grid">
          <div class="meta-left">
            <div class="meta-row">
              <span class="meta-label">Tanggal</span>
              <span class="meta-value">: ${formatDate(quotation.quotationDate)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">No.</span>
              <span class="meta-value">: ${quotation.quotationNumber}</span>
            </div>
          </div>
          <div class="valid-badge">Valid Thru: ${formatDate(quotation.validUntil)}</div>
        </div>

        <!-- Client Info -->
        <div class="section-title">Dibuat Untuk</div>
        <div class="meta-left">
          <div class="meta-row">
            <span class="meta-label">Nama Klien</span>
            <span class="meta-value">: ${quotation.clientName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Alamat</span>
            <span class="meta-value">: ${quotation.clientAddress || '-'}</span>
          </div>
        </div>

        <!-- Project Name -->
        <div class="project-title">${quotation.projectName}</div>

        ${quotation.projectDescription ? `<p style="font-size: 8pt; color: #666; margin-bottom: 8px;">${quotation.projectDescription}</p>` : ''}

        <!-- Items Table -->
        <table class="table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th class="center" style="width: 8%;">JML</th>
              <th class="center" style="width: 12%;">SATUAN</th>
              <th class="right" style="width: 18%;">HARGA SATUAN</th>
              <th class="right" style="width: 18%;">TOTAL HARGA</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-wrapper">
          <div class="totals-box">
            <div class="total-row subtotal">
              <span>JUMLAH BIAYA</span>
              <span>Rp. ${formatCurrencyPlain(quotation.subtotal)},-</span>
            </div>
            <div class="total-row ppn">
              <span>PPN ${quotation.ppnPercentage}%</span>
              <span>Rp. ${formatCurrencyPlain(quotation.ppnAmount)},-</span>
            </div>
            <div class="total-row grand">
              <span>TOTAL BIAYA</span>
              <span>Rp. ${formatCurrencyPlain(quotation.grandTotal)},-</span>
            </div>
          </div>
        </div>

        <!-- Terbilang -->
        <div class="terbilang">
          <strong>Terbilang:</strong> ${numberToWords(quotation.grandTotal)}
        </div>

        ${quotation.estimatedDuration ? `
        <div class="section-title">Estimasi Waktu Pengerjaan</div>
        <p style="font-size: 8pt;">${quotation.estimatedDuration}</p>
        ` : ''}

        ${quotation.paymentTerms && quotation.paymentTerms.length > 0 ? `
        <div class="section-title">Ketentuan Pembayaran</div>
        <ul class="terms-list">${paymentTermsHTML}</ul>
        ` : ''}

        ${quotation.guaranteeTerms && quotation.guaranteeTerms.length > 0 ? `
        <div class="section-title">Garansi & Support</div>
        <ul class="terms-list">${guaranteeHTML}</ul>
        ` : ''}

        <!-- Signature with TTE -->
        <div class="signature-section">
          <div class="signature-box">
            <p>Hormat kami,</p>
            <p style="font-weight: bold;">${company.name}</p>
            ${tteEnabled && qrCodeDataURL ? `
              <div class="signature-qr">
                <img src="${qrCodeDataURL}" alt="QR Verifikasi Dokumen" />
              </div>
            ` : ''}
            ${tteEnabled && tteSettings?.signer_name ? `
              <p class="signer-name">${tteSettings.signer_name}</p>
              <p class="signer-position">${tteSettings.signer_position || ''}</p>
            ` : `
              <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 5px;">
                <p style="font-size: 8pt; color: #666;">Authorized Signature</p>
              </div>
            `}
          </div>
        </div>

        <!-- TTE Section -->
        ${tteEnabled ? `
        <div class="tte-section">
          <div class="tte-info">
            <div class="tte-title">Tanda Tangan Elektronik</div>
            <div class="tte-detail">
              <span class="tte-label">Dokumen:</span>
              <span>${quotation.quotationNumber}</span>
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
              <span>${tteSettings?.signer_name || company.name}${tteSettings?.signer_position ? ` (${tteSettings.signer_position})` : ''}</span>
            </div>
            <div class="tte-hash">ID: ${verificationId}</div>
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <div class="footer-contact">
              <div class="footer-row">
                <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span>${company.address}</span>
              </div>
              <div class="footer-row">
                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span>${company.email}</span>
              </div>
              <div class="footer-row">
                <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                <span>${company.phone}</span>
              </div>
            </div>
            <div class="footer-decoration"></div>
          </div>
        </div>
      </div>

      <!-- Print Button -->
      <div class="no-print" style="text-align: center; padding: 20px; background: #f5f5f5;">
        <button onclick="window.print()" style="padding: 10px 30px; background: #3d5a80; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12pt; font-weight: 600;">
          Cetak / Download PDF
        </button>
      </div>
    </body>
    </html>
  `;
};

export const openPrintWindow = (html: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};
