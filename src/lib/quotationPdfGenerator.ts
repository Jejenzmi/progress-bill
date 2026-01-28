// Quotation PDF Generator untuk format PT Zen Multimedia Indonesia

import { generateTTESection, getTTEStyles, TTEData } from './qrCodeGenerator';

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
  const tteSection = tteEnabled ? await generateTTESection(tteData) : '';
  const itemRows = quotation.items.map((item, index) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${item.item}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: right;">Rp. ${formatCurrencyPlain(item.unitPrice)}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: right;">Rp. ${formatCurrencyPlain(item.total)},-</td>
    </tr>
  `).join('');

  const paymentTermsHTML = quotation.paymentTerms?.map((term, i) => `
    <li style="margin-bottom: 4px;">${term}</li>
  `).join('') || '';

  const guaranteeHTML = quotation.guaranteeTerms?.map((term, i) => `
    <li style="margin-bottom: 4px;">${term}</li>
  `).join('') || '';

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
          font-family: 'Segoe UI', 'Arial', sans-serif; 
          color: #333; 
          font-size: 11pt;
          line-height: 1.5;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          margin: 0 auto;
          background: white;
          position: relative;
        }
        
        /* Header with halftone pattern */
        .header-container {
          position: relative;
          height: 110px;
          margin-bottom: 15px;
          overflow: hidden;
        }
        .header-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 320px;
          height: 110px;
          background: 
            radial-gradient(circle at center, #3d5a80 2px, transparent 2px);
          background-size: 10px 10px;
          mask-image: 
            linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 80%, transparent 100%);
          mask-composite: intersect;
          -webkit-mask-image: 
            linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%);
        }
        .header-logo {
          position: absolute;
          top: 25px;
          right: 20mm;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-logo img {
          height: 60px;
          width: auto;
        }
        .company-text {
          text-align: left;
        }
        .company-name {
          font-size: 15pt;
          font-weight: bold;
          color: #3d5a80;
          letter-spacing: 0.5px;
        }
        
        /* Content area */
        .content-area {
          padding: 0 20mm 140px 20mm;
        }
        .title {
          text-align: center;
          font-size: 18pt;
          font-weight: bold;
          color: #3d5a80;
          margin: 15px 0;
          letter-spacing: 2px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 20px;
        }
        .meta-box {
          font-size: 10pt;
        }
        .meta-row {
          display: flex;
          margin-bottom: 4px;
        }
        .meta-label {
          width: 100px;
          color: #666;
        }
        .meta-value {
          font-weight: 500;
        }
        .section-title {
          font-size: 11pt;
          font-weight: bold;
          color: #3d5a80;
          margin: 20px 0 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #3d5a80;
        }
        .project-title {
          font-size: 12pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 12px;
          text-align: center;
          background: #e8f0f5;
          padding: 10px;
          border-radius: 4px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 9pt;
        }
        .table th {
          background: #3d5a80;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #3d5a80;
        }
        .table th.center { text-align: center; }
        .table th.right { text-align: right; }
        .table td {
          padding: 8px 10px;
          border: 1px solid #ddd;
        }
        .totals-section {
          margin-top: 15px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-box {
          width: 320px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          font-size: 10pt;
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
          font-size: 11pt;
          border-radius: 4px;
          margin-top: 5px;
        }
        .terbilang {
          background: #f5f8fa;
          padding: 10px 12px;
          margin-top: 12px;
          border-radius: 4px;
          font-style: italic;
          border-left: 4px solid #3d5a80;
          font-size: 10pt;
        }
        .terms-list {
          list-style: none;
          padding-left: 0;
          font-size: 10pt;
        }
        .terms-list li {
          padding-left: 18px;
          position: relative;
          margin-bottom: 4px;
        }
        .terms-list li::before {
          content: "•";
          color: #3d5a80;
          font-weight: bold;
          position: absolute;
          left: 0;
        }
        
        /* Footer with curved design */
        .footer-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 120px;
          overflow: hidden;
        }
        .footer-curve {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 250px;
          height: 200px;
          background: linear-gradient(135deg, #6b8cae 0%, #3d5a80 100%);
          border-radius: 100% 0 0 0;
          transform: translate(30px, 60px);
        }
        .footer-pattern {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 200px;
          height: 150px;
          background: radial-gradient(circle at center, rgba(255,255,255,0.3) 1.5px, transparent 1.5px);
          background-size: 8px 8px;
          mask-image: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.6) 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.6) 0%, transparent 70%);
        }
        .footer-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8px;
          background: #2c3e50;
        }
        .footer-contact {
          position: absolute;
          bottom: 20px;
          left: 20mm;
          font-size: 9pt;
          color: #333;
        }
        .footer-contact-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .footer-contact-row svg {
          width: 14px;
          height: 14px;
          fill: #3d5a80;
          flex-shrink: 0;
        }
        
        .signature-section {
          margin-top: 25px;
          display: flex;
          justify-content: flex-end;
        }
        .signature-box {
          text-align: center;
          width: 180px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          margin-top: 45px;
          margin-bottom: 5px;
        }
        .valid-thru {
          display: inline-block;
          background: #fff3cd;
          color: #856404;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 9pt;
          margin-top: 8px;
        }
        ${getTTEStyles()}
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page { 
            margin: 0; 
            padding: 0;
          }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header with halftone pattern -->
        <div class="header-container">
          <div class="header-pattern"></div>
          <div class="header-logo">
            ${company.logo_url ? `<img src="${company.logo_url}" alt="Company Logo" />` : ''}
            <div class="company-text">
              <div class="company-name">${company.name.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
          <!-- Title -->
          <h1 class="title">QUOTATION</h1>

          <!-- Meta Information -->
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-row">
                <span class="meta-label">Tanggal</span>
                <span class="meta-value">: ${formatDate(quotation.quotationDate)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">No.</span>
                <span class="meta-value">: ${quotation.quotationNumber}</span>
              </div>
            </div>
            <div class="meta-box" style="text-align: right;">
              <span class="valid-thru">Valid Thru: ${formatDate(quotation.validUntil)}</span>
            </div>
          </div>

          <!-- Client Info -->
          <div class="section-title">Dibuat Untuk</div>
          <div class="meta-box">
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

          ${quotation.projectDescription ? `
          <p style="font-size: 10pt; color: #666; margin-bottom: 12px;">${quotation.projectDescription}</p>
          ` : ''}

          <!-- Items Table -->
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40%;">ITEM</th>
                <th class="center" style="width: 10%;">JML</th>
                <th class="center" style="width: 15%;">SATUAN</th>
                <th class="right" style="width: 17%;">HARGA SATUAN</th>
                <th class="right" style="width: 18%;">TOTAL HARGA</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
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
          <p style="font-size: 10pt;">${quotation.estimatedDuration}</p>
          ` : ''}

          ${quotation.paymentTerms && quotation.paymentTerms.length > 0 ? `
          <div class="section-title">Ketentuan Pembayaran</div>
          <ul class="terms-list">
            ${paymentTermsHTML}
          </ul>
          ` : ''}

          ${quotation.guaranteeTerms && quotation.guaranteeTerms.length > 0 ? `
          <div class="section-title">Garansi & Support</div>
          <ul class="terms-list">
            ${guaranteeHTML}
          </ul>
          ` : ''}

          <!-- Signature -->
          <div class="signature-section">
            <div class="signature-box">
              <p>Hormat kami,</p>
              <p style="font-weight: bold; margin-top: 5px;">${company.name}</p>
              <div class="signature-line"></div>
              <p style="font-size: 9pt; color: #666;">Authorized Signature</p>
            </div>
          </div>

          <!-- TTE Section with QR Code -->
          ${tteSection}
        </div>

        <!-- Footer with curved design -->
        <div class="footer-container">
          <div class="footer-curve"></div>
          <div class="footer-pattern"></div>
          <div class="footer-contact">
            <div class="footer-contact-row">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${company.address}</span>
            </div>
            <div class="footer-contact-row">
              <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <span>${company.email}</span>
            </div>
            <div class="footer-contact-row">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              <span>${company.phone}</span>
            </div>
          </div>
          <div class="footer-bar"></div>
        </div>
      </div>

      <!-- Print Button -->
      <div class="no-print" style="text-align: center; padding: 30px; background: #f5f5f5;">
        <button onclick="window.print()" style="padding: 12px 40px; background: #3d5a80; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14pt; font-weight: 600;">
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
