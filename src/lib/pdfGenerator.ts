// PDF Generator utility using jsPDF
// We'll use the browser's print functionality for now and can add jsPDF later

export interface CompanyProfile {
  name: string;
  npwp: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bank_info: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  clientName: string;
  clientAddress: string;
  projectName: string;
  termName: string;
  amount: number;
  taxInvoiceNumber?: string;
  notes?: string;
}

export interface QuotationData {
  projectName: string;
  clientName: string;
  manDays: Array<{ role: string; ratePerDay: number; days: number; total: number }>;
  hostingCost: number;
  maintenanceCost: number;
  maintenancePeriod: string;
  totalDevelopment: number;
  grandTotal: number;
  validUntil: Date;
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
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

export const generateInvoiceHTML = (
  invoice: InvoiceData,
  company: CompanyProfile
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #0080ff; }
        .company-info { text-align: right; font-size: 12px; color: #666; }
        .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #0080ff; }
        .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .meta-box { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .meta-label { font-size: 12px; color: #666; margin-bottom: 4px; }
        .meta-value { font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .table th { background: #f8f9fa; font-weight: 600; color: #666; }
        .table .amount { text-align: right; }
        .total-row { font-weight: bold; font-size: 18px; background: #0080ff10; }
        .total-row td { color: #0080ff; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        .bank-info { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .bank-title { font-weight: 600; margin-bottom: 8px; }
        .notes { margin-top: 20px; font-size: 12px; color: #666; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">${company.name}</div>
        <div class="company-info">
          <p>${company.address}</p>
          <p>Tel: ${company.phone} | Email: ${company.email}</p>
          <p>NPWP: ${company.npwp}</p>
        </div>
      </div>
      
      <h1 class="invoice-title">INVOICE</h1>
      
      <div class="invoice-meta">
        <div class="meta-box">
          <div class="meta-label">No. Invoice</div>
          <div class="meta-value">${invoice.invoiceNumber}</div>
          <div class="meta-label" style="margin-top: 10px;">Tanggal</div>
          <div class="meta-value">${formatDate(invoice.invoiceDate)}</div>
          <div class="meta-label" style="margin-top: 10px;">Jatuh Tempo</div>
          <div class="meta-value">${formatDate(invoice.dueDate)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Kepada</div>
          <div class="meta-value">${invoice.clientName}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${invoice.clientAddress || ''}</div>
        </div>
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Deskripsi</th>
            <th class="amount">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${invoice.projectName}</strong><br>
              <span style="font-size: 12px; color: #666;">${invoice.termName}</span>
            </td>
            <td class="amount">${formatCurrency(invoice.amount)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL</td>
            <td class="amount">${formatCurrency(invoice.amount)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <div class="bank-info">
          <div class="bank-title">Informasi Pembayaran</div>
          <p>${company.bank_info}</p>
        </div>
        ${invoice.notes ? `<div class="notes"><strong>Catatan:</strong> ${invoice.notes}</div>` : ''}
      </div>
      
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 30px; background: #0080ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
          Cetak / Download PDF
        </button>
      </div>
    </body>
    </html>
  `;
};

export const generateQuotationHTML = (
  quotation: QuotationData,
  company: CompanyProfile
): string => {
  const manDaysRows = quotation.manDays.map(item => `
    <tr>
      <td>${item.role}</td>
      <td class="amount">${formatCurrency(item.ratePerDay)}</td>
      <td style="text-align: center;">${item.days}</td>
      <td class="amount">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Quotation - ${quotation.projectName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #0080ff; }
        .company-info { text-align: right; font-size: 12px; color: #666; }
        .title { font-size: 28px; font-weight: bold; margin-bottom: 10px; color: #0080ff; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 16px; font-weight: 600; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #0080ff; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .info-label { font-size: 12px; color: #666; margin-bottom: 4px; }
        .info-value { font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .table th { background: #f8f9fa; font-weight: 600; color: #666; }
        .table .amount { text-align: right; }
        .subtotal-row { background: #f8f9fa; font-weight: 600; }
        .total-section { background: #0080ff; color: white; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .total-label { font-size: 14px; opacity: 0.9; }
        .total-value { font-size: 28px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
        .validity { background: #fff3cd; padding: 10px 15px; border-radius: 5px; margin-top: 20px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">${company.name}</div>
        <div class="company-info">
          <p>${company.address}</p>
          <p>Tel: ${company.phone} | Email: ${company.email}</p>
        </div>
      </div>
      
      <h1 class="title">PENAWARAN HARGA</h1>
      <p class="subtitle">Proposal Komersial</p>
      
      <div class="section">
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Nama Proyek</div>
            <div class="info-value">${quotation.projectName}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Klien</div>
            <div class="info-value">${quotation.clientName}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Estimasi Man-Days</div>
        <table class="table">
          <thead>
            <tr>
              <th>Role</th>
              <th class="amount">Rate/Hari</th>
              <th style="text-align: center;">Hari</th>
              <th class="amount">Total</th>
            </tr>
          </thead>
          <tbody>
            ${manDaysRows}
            <tr class="subtotal-row">
              <td colspan="3">Subtotal Development</td>
              <td class="amount">${formatCurrency(quotation.totalDevelopment)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Biaya Tambahan</div>
        <table class="table">
          <tbody>
            <tr>
              <td>Hosting (Tahunan)</td>
              <td class="amount">${formatCurrency(quotation.hostingCost)}</td>
            </tr>
            <tr>
              <td>Maintenance (${quotation.maintenancePeriod})</td>
              <td class="amount">${formatCurrency(quotation.maintenanceCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="total-section">
        <div class="total-label">Grand Total</div>
        <div class="total-value">${formatCurrency(quotation.grandTotal)}</div>
      </div>
      
      <div class="validity">
        <strong>Berlaku hingga:</strong> ${formatDate(quotation.validUntil)}
      </div>
      
      <div class="footer">
        <p>Penawaran ini bersifat tidak mengikat dan dapat berubah berdasarkan kesepakatan lebih lanjut.</p>
        <p style="margin-top: 10px;">${company.name} | ${company.website}</p>
      </div>
      
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 30px; background: #0080ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
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
