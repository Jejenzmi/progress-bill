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
  
  // Get the published URL for verification (use production URL)
  const publishedUrl = 'https://progress-bill.lovable.app';
  const verificationUrl = `${publishedUrl}/verify?id=${verificationId}`;
  
  // Generate QR Code for TTE - QR code contains ONLY the URL for direct redirect
  let qrCodeDataURL = '';
  if (tteEnabled) {
    qrCodeDataURL = await generateQRCodeDataURL(verificationUrl);
  }
  
  const itemRows = quotation.items.map((item) => `
    <tr>
      <td class="item-cell">${item.item}</td>
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

  // Use logo from settings if available, otherwise use the published URL fallback
  const publishedBaseUrl = 'https://progress-bill.lovable.app';
  const logoSrc = company.logo_url || `${publishedBaseUrl}/zen-logo-quotation.png`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Quotation - ${quotation.quotationNumber}</title>
      <style>
        @page { 
          size: A4; 
          margin: 0; 
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
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 0;
          margin: 0 auto;
          background: white;
          position: relative;
          overflow: hidden;
        }
        
        /* Header */
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 10mm 15mm 8mm 15mm;
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
          height: 55px;
          width: auto;
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
          padding: 0 15mm;
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
        .center-cell { text-align: center; }
        .right-cell { text-align: right; }
        
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
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-box p {
          font-size: 9pt;
        }
        .signer-name {
          font-weight: bold;
          margin-top: 40px;
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
        
        /* Footer */
        .footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
        }
        .footer-curve {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 180px;
          height: 140px;
          background: linear-gradient(135deg, #6b8cae 0%, #3d5a80 100%);
          border-radius: 100% 0 0 0;
          transform: translate(20px, 40px);
        }
        .footer-dots {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 140px;
          height: 100px;
          background: radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px);
          background-size: 6px 6px;
          mask-image: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.5) 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.5) 0%, transparent 70%);
        }
        .footer-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: #2c3e50;
        }
        .footer-contact {
          position: absolute;
          bottom: 15px;
          left: 15mm;
          font-size: 7pt;
          color: #333;
        }
        .footer-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .footer-row svg {
          width: 10px;
          height: 10px;
          fill: #3d5a80;
          flex-shrink: 0;
        }
        
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page { 
            margin: 0; 
            padding: 0;
            page-break-after: avoid;
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-pattern"></div>
          <div class="header-info">
            <img src="${logoSrc}" alt="Logo" class="header-logo" onerror="this.style.display='none'" />
            <div class="company-name">PT. ZEN MULTIMEDIA<br/>INDONESIA</div>
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
            <div class="tte-qr">
              ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR TTE" />` : ''}
            </div>
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
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-curve"></div>
          <div class="footer-dots"></div>
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
          <div class="footer-bar"></div>
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
