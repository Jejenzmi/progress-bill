// Invoice PDF Generator untuk format PT Zen Multimedia Indonesia

import { generateTTESection, getTTEStyles, TTEData } from './qrCodeGenerator';

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

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  clientName: string;
  clientAddress: string;
  projectName: string;
  termName: string;
  items: InvoiceItem[];
  subtotal: number;
  ppnPercentage: number;
  ppnAmount: number;
  grandTotal: number;
  taxInvoiceNumber?: string;
  notes?: string;
}

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

export const generateInvoicePDF = async (
  invoice: InvoiceData,
  company: CompanyProfile
): Promise<string> => {
  // Generate TTE data
  const tteData: TTEData = {
    documentType: 'Invoice',
    documentNumber: invoice.invoiceNumber,
    documentDate: invoice.invoiceDate,
    companyName: company.name,
    clientName: invoice.clientName,
    totalAmount: invoice.grandTotal,
    signedAt: new Date(),
  };
  
  const tteSection = await generateTTESection(tteData);
  const itemRows = invoice.items.map((item) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${item.description}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: right;">Rp. ${formatCurrencyPlain(item.unitPrice)}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0; text-align: right;">Rp. ${formatCurrencyPlain(item.total)},-</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${invoice.invoiceNumber}</title>
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
          padding: 15mm 20mm;
          margin: 0 auto;
          background: white;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1a5f7a;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .company-name {
          font-size: 18pt;
          font-weight: bold;
          color: #1a5f7a;
        }
        .header-right {
          text-align: right;
          font-size: 9pt;
          color: #666;
        }
        .title {
          text-align: center;
          font-size: 20pt;
          font-weight: bold;
          color: #1a5f7a;
          margin: 20px 0;
          letter-spacing: 2px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 25px;
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
          font-size: 12pt;
          font-weight: bold;
          color: #1a5f7a;
          margin: 25px 0 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid #1a5f7a;
        }
        .project-title {
          font-size: 13pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
          text-align: center;
          background: #f0f7fa;
          padding: 12px;
          border-radius: 6px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10pt;
        }
        .table th {
          background: #1a5f7a;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #1a5f7a;
        }
        .table th.center { text-align: center; }
        .table th.right { text-align: right; }
        .totals-section {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-box {
          width: 350px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 11pt;
        }
        .total-row.subtotal {
          border-bottom: 1px solid #e0e0e0;
        }
        .total-row.ppn {
          color: #666;
        }
        .total-row.grand {
          background: #1a5f7a;
          color: white;
          font-weight: bold;
          font-size: 12pt;
          border-radius: 4px;
          margin-top: 5px;
        }
        .terbilang {
          background: #f9f9f9;
          padding: 12px 15px;
          margin-top: 15px;
          border-radius: 6px;
          font-style: italic;
          border-left: 4px solid #1a5f7a;
        }
        .bank-info {
          background: #f0f7fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 25px;
          border: 1px solid #1a5f7a20;
        }
        .bank-title {
          font-weight: 600;
          color: #1a5f7a;
          margin-bottom: 8px;
        }
        .notes {
          margin-top: 15px;
          padding: 12px;
          background: #fff9e6;
          border-radius: 6px;
          border-left: 4px solid #f0ad4e;
          font-size: 10pt;
        }
        .footer {
          position: absolute;
          bottom: 15mm;
          left: 20mm;
          right: 20mm;
          text-align: center;
          font-size: 9pt;
          color: #666;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
        }
        .footer-content {
          display: flex;
          justify-content: center;
          gap: 30px;
        }
        .signature-section {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          margin-top: 50px;
          margin-bottom: 5px;
        }
        ${getTTEStyles()}
        .due-date-box {
          display: inline-block;
          background: #dc3545;
          color: white;
          padding: 5px 15px;
          border-radius: 4px;
          font-size: 10pt;
          margin-top: 10px;
        }
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page { 
            margin: 0; 
            padding: 15mm 20mm;
          }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            ${company.logo_url ? `<img src="${company.logo_url}" alt="Company Logo" style="height: 50px; width: auto; object-fit: contain;" />` : ''}
            <div>
              <div class="company-name">${company.name}</div>
              <div style="font-size: 9pt; color: #666;">NPWP: ${company.npwp}</div>
            </div>
          </div>
          <div class="header-right">
            <p>${company.address}</p>
            <p>${company.email}</p>
            <p>${company.phone}</p>
          </div>
        </div>

        <!-- Title -->
        <h1 class="title">INVOICE</h1>

        <!-- Meta Information -->
        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-row">
              <span class="meta-label">No. Invoice</span>
              <span class="meta-value">: ${invoice.invoiceNumber}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Tanggal</span>
              <span class="meta-value">: ${formatDate(invoice.invoiceDate)}</span>
            </div>
            ${invoice.taxInvoiceNumber ? `
            <div class="meta-row">
              <span class="meta-label">No. Faktur Pajak</span>
              <span class="meta-value">: ${invoice.taxInvoiceNumber}</span>
            </div>
            ` : ''}
          </div>
          <div class="meta-box" style="text-align: right;">
            <span class="due-date-box">Jatuh Tempo: ${formatDate(invoice.dueDate)}</span>
          </div>
        </div>

        <!-- Client Info -->
        <div class="section-title">Kepada</div>
        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">Nama</span>
            <span class="meta-value">: ${invoice.clientName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Alamat</span>
            <span class="meta-value">: ${invoice.clientAddress || '-'}</span>
          </div>
        </div>

        <!-- Project Name -->
        <div class="project-title">
          ${invoice.projectName}
          <div style="font-size: 10pt; font-weight: normal; color: #666; margin-top: 4px;">
            ${invoice.termName}
          </div>
        </div>

        <!-- Items Table -->
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40%;">DESKRIPSI</th>
              <th class="center" style="width: 10%;">JML</th>
              <th class="center" style="width: 15%;">SATUAN</th>
              <th class="right" style="width: 17%;">HARGA SATUAN</th>
              <th class="right" style="width: 18%;">JUMLAH</th>
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
              <span>SUBTOTAL</span>
              <span>Rp. ${formatCurrencyPlain(invoice.subtotal)},-</span>
            </div>
            <div class="total-row ppn">
              <span>PPN ${invoice.ppnPercentage}%</span>
              <span>Rp. ${formatCurrencyPlain(invoice.ppnAmount)},-</span>
            </div>
            <div class="total-row grand">
              <span>TOTAL</span>
              <span>Rp. ${formatCurrencyPlain(invoice.grandTotal)},-</span>
            </div>
          </div>
        </div>

        <!-- Terbilang -->
        <div class="terbilang">
          <strong>Terbilang:</strong> ${numberToWords(invoice.grandTotal)}
        </div>

        <!-- Bank Info -->
        <div class="bank-info">
          <div class="bank-title">Informasi Pembayaran</div>
          <p style="white-space: pre-line; font-size: 10pt;">${company.bank_info}</p>
        </div>

        ${invoice.notes ? `
        <div class="notes">
          <strong>Catatan:</strong> ${invoice.notes}
        </div>
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

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <span>${company.address}</span>
            <span>${company.email}</span>
            <span>${company.phone}</span>
          </div>
        </div>
      </div>

      <!-- Print Button -->
      <div class="no-print" style="text-align: center; padding: 30px; background: #f5f5f5;">
        <button onclick="window.print()" style="padding: 12px 40px; background: #1a5f7a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14pt; font-weight: 600;">
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
