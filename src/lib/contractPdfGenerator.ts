// Contract PDF Generator for Surat Perjanjian Kerjasama PT Zen Multimedia Indonesia

import { formatCurrencyPlain, numberToWords, formatDate } from './quotationPdfGenerator';

export interface ContractCompanyInfo {
  name: string;
  npwp: string;
  address: string;
  director_name: string;
  director_position: string;
  email: string;
  phone: string;
  logo_url?: string;
}

export interface ContractClientInfo {
  company_name: string;
  npwp: string;
  address: string;
  pic_name: string;
  pic_nik: string;
  pic_position: string;
  pic_phone: string;
  pic_email: string;
}

export interface ContractPaymentTerm {
  term_name: string;
  percentage: number;
  description: string;
}

export interface AdditionalCost {
  description: string;
  amount: number;
  notes?: string;
}

export interface CustomClause {
  title: string;
  content: string;
}

export interface ContractData {
  contract_number: string;
  contract_date: Date;
  project_name: string;
  project_description: string;
  quotation_number?: string;
  quotation_date?: Date;
  total_value: number;
  start_date: Date;
  end_date: Date;
  duration_months: number;
  payment_terms: ContractPaymentTerm[];
  bank_info: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch?: string;
  };
  additional_costs: AdditionalCost[];
  additional_notes?: string;
  custom_clauses: CustomClause[];
  maintenance_period_months?: number;
  free_server_months?: number;
  free_domain_months?: number;
  max_payment_days?: number;
  party1_obligations?: { text: string }[];
  party2_obligations?: { text: string }[];
}

const formatDateLong = (date: Date): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  return `${days[date.getDay()]}, tanggal ${date.getDate()} bulan ${months[date.getMonth()]} tahun ${date.getFullYear()}`;
};

const formatDateShort = (date: Date): string => {
  return `${date.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()]} ${date.getFullYear()}`;
};

export const generateContractPDF = async (
  contract: ContractData,
  company: ContractCompanyInfo,
  client: ContractClientInfo,
  signerName?: string,
  signerPosition?: string
): Promise<string> => {
  // Generate payment terms HTML
  const paymentTermsHTML = contract.payment_terms.map((term, idx) => `
    <li><strong>Termin ${idx + 1} – ${term.percentage}%</strong> ${term.description}</li>
  `).join('');

  // Generate additional costs HTML
  const additionalCostsHTML = contract.additional_costs.length > 0 
    ? contract.additional_costs.map((cost) => `
        <li>${cost.description}: Rp. ${formatCurrencyPlain(cost.amount)}${cost.notes ? ` (${cost.notes})` : ''}</li>
      `).join('')
    : '';

  // Generate custom clauses HTML
  const customClausesHTML = contract.custom_clauses.map((clause, idx) => `
    <div class="section">
      <h3>Pasal ${11 + idx}</h3>
      <h4>${clause.title}</h4>
      <p>${clause.content}</p>
    </div>
  `).join('');

  // Generate party obligations HTML - use custom if provided, otherwise default
  const defaultParty1Obligations = [
    'Menyediakan tenaga ahli yang kompeten dan berpengalaman untuk pelaksanaan proyek.',
    'Menyelesaikan proyek sesuai dengan jadwal yang telah disepakati dalam perjanjian ini.',
    'Memberikan dukungan teknis dan pemeliharaan setelah sistem selesai dibangun sesuai ketentuan pada Pasal 5.',
    'Menyediakan dokumentasi sistem dan memberikan pelatihan kepada pengguna.',
  ];
  
  const defaultParty2Obligations = [
    'Menyediakan data dan informasi yang dibutuhkan oleh PIHAK PERTAMA untuk menyelesaikan proyek.',
    'Melakukan review terhadap hasil kerja PIHAK PERTAMA sesuai dengan jadwal yang disepakati.',
    'Membayar biaya proyek sesuai dengan jadwal pembayaran yang disepakati.',
    'Menyediakan akses untuk pengujian sistem di lingkungan PIHAK KEDUA.',
  ];

  const party1ObligationsList = contract.party1_obligations && contract.party1_obligations.length > 0
    ? contract.party1_obligations.map(o => o.text)
    : defaultParty1Obligations;

  const party2ObligationsList = contract.party2_obligations && contract.party2_obligations.length > 0
    ? contract.party2_obligations.map(o => o.text)
    : defaultParty2Obligations;

  // Add server and domain info to party 1 obligations if provided
  const party1WithExtras = [...party1ObligationsList];
  if (contract.free_server_months) {
    party1WithExtras.push(`Menyediakan Cloud Server selama ${contract.free_server_months} Bulan terhitung sejak digunakannya aplikasi.`);
  }
  if (contract.free_domain_months) {
    party1WithExtras.push(`Menyediakan Domain Free selama ${contract.free_domain_months} Bulan.`);
  }

  const party1ObligationsHTML = party1WithExtras.map(text => `<li>${text}</li>`).join('');
  const party2ObligationsHTML = party2ObligationsList.map(text => `<li>${text}</li>`).join('');

  // Helper to convert image to data URL
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

  const totalValueWords = numberToWords(contract.total_value).replace(' Rupiah', '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Kontrak SPK - ${contract.contract_number}</title>
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
          font-family: 'Times New Roman', Times, serif; 
          color: #1a1a2e; 
          font-size: 11pt;
          line-height: 1.7;
          background: #fff;
        }
        
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 0;
          position: relative;
          background: #fff;
        }
        
        /* ===== HEADER SECTION ===== */
        .header-container {
          position: relative;
          width: 100%;
          height: 100px;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%);
          overflow: hidden;
        }
        
        .header-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0);
          background-size: 12px 12px;
        }
        
        .header-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 30px;
        }
        
        .header-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 30px;
          height: 100%;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .header-logo {
          width: 60px;
          height: 60px;
          background: #fff;
          border-radius: 8px;
          padding: 5px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .header-text {
          color: #fff;
        }
        
        .header-company-name {
          font-size: 18pt;
          font-weight: bold;
          letter-spacing: 1px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header-tagline {
          font-size: 9pt;
          opacity: 0.9;
          letter-spacing: 0.5px;
        }
        
        .header-right {
          text-align: right;
          color: #fff;
          font-size: 8pt;
          opacity: 0.9;
        }
        
        .header-right p {
          margin-bottom: 2px;
        }
        
        /* ===== CONTENT SECTION ===== */
        .content {
          padding: 25px 35px 80px 35px;
        }
        
        /* Document Title */
        .document-title {
          text-align: center;
          margin: 20px 0 30px 0;
          padding: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 10px;
          border: 2px solid #1e3a5f;
        }
        
        .document-title h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #1e3a5f;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 10px;
        }
        
        .document-title .doc-number {
          font-size: 12pt;
          color: #2d5a87;
          font-weight: 600;
        }
        
        /* Introduction */
        .intro {
          margin: 20px 0;
          text-align: justify;
          font-size: 11pt;
        }
        
        /* Party Section */
        .party-section {
          margin: 25px 0;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #1e3a5f;
        }
        
        .party-title {
          font-size: 12pt;
          font-weight: bold;
          color: #1e3a5f;
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #cbd5e1;
        }
        
        .party-table {
          width: 100%;
          margin-left: 15px;
        }
        
        .party-table tr td:first-child {
          width: 200px;
          font-weight: 500;
          color: #475569;
          padding: 4px 0;
        }
        
        .party-table tr td:nth-child(2) {
          width: 20px;
          text-align: center;
        }
        
        .party-table tr td:nth-child(3) {
          color: #1a1a2e;
        }
        
        .party-label {
          margin-top: 12px;
          margin-left: 15px;
          font-style: italic;
          color: #64748b;
        }
        
        /* Pasal/Section */
        .section {
          margin: 25px 0;
          page-break-inside: avoid;
        }
        
        .section h3 {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          color: #1e3a5f;
          margin-bottom: 5px;
        }
        
        .section h4 {
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          color: #2d5a87;
          margin-bottom: 15px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        
        .section p {
          text-align: justify;
          margin-bottom: 10px;
        }
        
        .section ol, .section ul {
          margin-left: 25px;
          margin-bottom: 12px;
        }
        
        .section li {
          margin-bottom: 6px;
          text-align: justify;
        }
        
        .subsection {
          margin: 15px 0 15px 20px;
        }
        
        .subsection-title {
          font-weight: bold;
          color: #334155;
          margin-bottom: 8px;
        }
        
        /* Highlight Box */
        .highlight-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 15px 20px;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
          margin: 20px 0;
        }
        
        .highlight-box p {
          margin-bottom: 5px;
        }
        
        /* Info Box */
        .info-box {
          background: #eff6ff;
          padding: 15px 20px;
          border-radius: 8px;
          border: 1px solid #bfdbfe;
          margin: 15px 0;
        }
        
        .info-box strong {
          color: #1e40af;
        }
        
        /* Bank Info */
        .bank-info {
          background: #f0fdf4;
          padding: 15px 20px;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
          margin: 15px 0;
        }
        
        .bank-info ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .bank-info li {
          padding: 5px 0;
          border-bottom: 1px dotted #86efac;
        }
        
        .bank-info li:last-child {
          border-bottom: none;
        }
        
        /* Signature Section */
        .signature-section {
          margin-top: 50px;
          page-break-inside: avoid;
        }
        
        .signature-intro {
          text-align: center;
          margin-bottom: 30px;
          font-style: italic;
          color: #64748b;
        }
        
        .signature-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .signature-box {
          width: 45%;
          text-align: center;
          vertical-align: top;
          padding: 15px;
        }
        
        .signature-party-label {
          font-weight: bold;
          font-size: 11pt;
          color: #1e3a5f;
          margin-bottom: 5px;
        }
        
        .signature-company {
          font-size: 10pt;
          color: #64748b;
          margin-bottom: 70px;
        }
        
        .signature-line {
          border-bottom: 2px solid #1e3a5f;
          width: 80%;
          margin: 0 auto 8px auto;
        }
        
        .signature-name {
          font-weight: bold;
          font-size: 11pt;
          color: #1a1a2e;
        }
        
        .signature-position {
          font-size: 10pt;
          color: #64748b;
          font-style: italic;
        }
        
        /* ===== FOOTER SECTION ===== */
        .footer-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 60px;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          overflow: hidden;
        }
        
        .footer-wave {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 15px;
        }
        
        .footer-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 30px;
          color: #fff;
          font-size: 9pt;
        }
        
        .footer-content p {
          margin: 0 20px;
          opacity: 0.9;
        }
        
        /* Page Break */
        .page-break {
          page-break-before: always;
        }
        
        /* Print Styles */
        @media print {
          .page {
            width: 210mm;
            min-height: 297mm;
          }
          
          .header-container {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .footer-container {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header-container">
          <div class="header-pattern"></div>
          <svg class="header-wave" viewBox="0 0 1200 30" preserveAspectRatio="none">
            <path d="M0,30 Q300,0 600,15 T1200,30 L1200,30 L0,30 Z" fill="#fff"/>
          </svg>
          <div class="header-content">
            <div class="header-left">
              <div class="header-logo">
                <img src="${logoSrc}" alt="Logo" />
              </div>
              <div class="header-text">
                <div class="header-company-name">${company.name}</div>
                <div class="header-tagline">Software Development & IT Solutions</div>
              </div>
            </div>
            <div class="header-right">
              <p>${company.address}</p>
              <p>${company.email}</p>
              <p>${company.phone}</p>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Document Title -->
          <div class="document-title">
            <h1>Surat Perjanjian Kerjasama</h1>
            <p class="doc-number">Nomor: ${contract.contract_number}</p>
          </div>
          
          <!-- Introduction -->
          <div class="intro">
            <p>Pada hari ini, <strong>${formatDateLong(contract.contract_date)}</strong>, kami yang bertanda tangan di bawah ini:</p>
          </div>
          
          <!-- Pihak Pertama -->
          <div class="party-section">
            <p class="party-title">PIHAK PERTAMA</p>
            <table class="party-table">
              <tr><td>Nama Perusahaan</td><td>:</td><td><strong>${company.name}</strong></td></tr>
              <tr><td>NPWP</td><td>:</td><td>${company.npwp}</td></tr>
              <tr><td>Alamat</td><td>:</td><td>${company.address}</td></tr>
              <tr><td>Diwakili Oleh</td><td>:</td><td><strong>${signerName || company.director_name}</strong></td></tr>
              <tr><td>Jabatan</td><td>:</td><td>${signerPosition || company.director_position}</td></tr>
            </table>
            <p class="party-label">Selanjutnya disebut sebagai <strong>"PIHAK PERTAMA"</strong></p>
          </div>
          
          <!-- Pihak Kedua -->
          <div class="party-section">
            <p class="party-title">PIHAK KEDUA</p>
            <table class="party-table">
              <tr><td>Nama Perusahaan/Instansi</td><td>:</td><td><strong>${client.company_name}</strong></td></tr>
              <tr><td>NPWP</td><td>:</td><td>${client.npwp || '-'}</td></tr>
              <tr><td>Alamat</td><td>:</td><td>${client.address || '-'}</td></tr>
              <tr><td>Nama Penanggung Jawab</td><td>:</td><td><strong>${client.pic_name}</strong></td></tr>
              <tr><td>NIK</td><td>:</td><td>${client.pic_nik || '-'}</td></tr>
              <tr><td>Jabatan</td><td>:</td><td>${client.pic_position || 'Direktur'}</td></tr>
              <tr><td>Nomor Telepon</td><td>:</td><td>${client.pic_phone || '-'}</td></tr>
              <tr><td>Email</td><td>:</td><td>${client.pic_email || '-'}</td></tr>
            </table>
            <p class="party-label">Selanjutnya disebut sebagai <strong>"PIHAK KEDUA"</strong></p>
          </div>
          
          <p class="intro">Kedua belah pihak sepakat untuk menjalin kerjasama dalam hal pengembangan sistem perangkat lunak (software development) dengan ketentuan-ketentuan sebagai berikut:</p>
          
          <!-- Pasal 1: Ruang Lingkup -->
          <div class="section">
            <h3>Pasal 1</h3>
            <h4>Ruang Lingkup Kerjasama</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Layanan yang Diberikan</p>
              <p>PIHAK PERTAMA akan menyediakan layanan pengembangan perangkat lunak yang meliputi:</p>
              <ul>
                <li><strong>Analisis Kebutuhan:</strong> Melakukan analisis terhadap kebutuhan bisnis dan teknis yang dibutuhkan oleh PIHAK KEDUA.</li>
                <li><strong>Desain dan Perancangan Sistem:</strong> Merancang dan membuat blueprint sistem yang meliputi desain UI/UX dan arsitektur sistem.</li>
                <li><strong>Pengembangan Sistem:</strong> Melakukan pengembangan sistem sesuai dengan ketentuan dan waktu yang disepakati.</li>
                <li><strong>Implementasi dan Pengujian:</strong> Melakukan implementasi sistem di lingkungan produksi dan melakukan pengujian sistem (UAT - User Acceptance Test).</li>
                <li><strong>Pemeliharaan dan Dukungan:</strong> Memberikan dukungan teknis dan pemeliharaan sistem sesuai dengan kesepakatan pada Pasal 5.</li>
              </ul>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Lingkup Proyek</p>
              <div class="info-box">
                <ul style="list-style: none; margin: 0; padding: 0;">
                  <li><strong>Nama Proyek:</strong> ${contract.project_name}</li>
                  <li><strong>Deskripsi Proyek:</strong> ${contract.project_description}</li>
                  <li><strong>Durasi Proyek:</strong> ${formatDateShort(contract.start_date)} s/d ${formatDateShort(contract.end_date)} (${contract.duration_months} bulan)</li>
                  ${contract.quotation_number ? `<li><strong>Referensi Quotation:</strong> ${contract.quotation_number} (${contract.quotation_date ? formatDateShort(contract.quotation_date) : '-'})</li>` : ''}
                </ul>
              </div>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">3. Deliverables</p>
              <p>PIHAK PERTAMA akan menyerahkan deliverables berikut kepada PIHAK KEDUA:</p>
              <ul>
                <li>Prototipe atau versi awal dari sistem</li>
                <li>Dokumentasi teknis</li>
                <li>Pelatihan bagi pengguna terkait cara menggunakan sistem</li>
                <li>Laporan kemajuan secara berkala</li>
              </ul>
            </div>
          </div>
          
          <!-- Pasal 2: Jangka Waktu -->
          <div class="section">
            <h3>Pasal 2</h3>
            <h4>Jangka Waktu Perjanjian</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Durasi Perjanjian</p>
              <p>Perjanjian ini berlaku selama <strong>${contract.duration_months} (${numberToWords(contract.duration_months).replace(' Rupiah', '').toLowerCase()}) bulan</strong>, terhitung sejak tanggal penandatanganan perjanjian ini, yaitu mulai tanggal ${formatDateShort(contract.start_date)} hingga ${formatDateShort(contract.end_date)}, dengan ketentuan dapat diperpanjang atau diperbaharui sesuai kesepakatan kedua belah pihak.</p>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Tenggat Waktu Penyelesaian</p>
              <p>Penyelesaian proyek harus dilakukan dalam jangka waktu yang disepakati, kecuali terjadi force majeure. Jika terjadi keterlambatan dalam penyelesaian proyek, maka PIHAK PERTAMA akan dikenakan sanksi sesuai dengan Pasal 10.</p>
            </div>
          </div>
          
          <!-- Pasal 3: Biaya dan Pembayaran -->
          <div class="section">
            <h3>Pasal 3</h3>
            <h4>Biaya dan Pembayaran</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Biaya Proyek</p>
              <div class="highlight-box">
                <p><strong>Nilai Total Proyek:</strong></p>
                <p style="font-size: 14pt; color: #1e3a5f;"><strong>Rp ${formatCurrencyPlain(contract.total_value)}</strong></p>
                <p style="font-style: italic; color: #64748b;">(Terbilang: ${totalValueWords} Rupiah)</p>
                <p style="font-size: 9pt; margin-top: 5px;">*Belum termasuk pajak</p>
              </div>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Jadwal Pembayaran</p>
              <p>Pembayaran dilakukan dalam ${contract.payment_terms.length} (${numberToWords(contract.payment_terms.length).replace(' Rupiah', '').toLowerCase()}) termin sebagai berikut:</p>
              <ol>
                ${paymentTermsHTML}
              </ol>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">3. Metode Pembayaran</p>
              <p>Pembayaran dilakukan melalui transfer ke rekening PIHAK PERTAMA:</p>
              <div class="bank-info">
                <ul>
                  <li><strong>Bank:</strong> ${contract.bank_info.bank_name}</li>
                  <li><strong>Atas Nama:</strong> ${contract.bank_info.account_name}</li>
                  <li><strong>No. Rekening:</strong> ${contract.bank_info.account_number}</li>
                  ${contract.bank_info.branch ? `<li><strong>Cabang:</strong> ${contract.bank_info.branch}</li>` : ''}
                </ul>
              </div>
              <p>Pembayaran tersebut belum termasuk pajak, yang akan ditanggung oleh PIHAK KEDUA sesuai dengan ketentuan yang berlaku. Waktu Pembayaran dilakukan maksimal <strong>${contract.max_payment_days || 4} (${numberToWords(contract.max_payment_days || 4).replace(' Rupiah', '').toLowerCase()}) Hari Kerja</strong> setelah diterbitkannya Invoice.</p>
            </div>
            
            ${contract.additional_costs.length > 0 ? `
            <div class="subsection">
              <p class="subsection-title">4. Additional Cost</p>
              <ul>
                ${additionalCostsHTML}
              </ul>
            </div>
            ` : ''}
          </div>
          
          <!-- Pasal 4: Hak dan Kewajiban -->
          <div class="section">
            <h3>Pasal 4</h3>
            <h4>Hak dan Kewajiban</h4>
            
            <div class="subsection">
              <p class="subsection-title">PIHAK PERTAMA berkewajiban untuk:</p>
              <ol>
                ${party1ObligationsHTML}
              </ol>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">PIHAK KEDUA berkewajiban untuk:</p>
              <ol>
                ${party2ObligationsHTML}
              </ol>
            </div>
          </div>
          
          <!-- Pasal 5: Pemeliharaan -->
          <div class="section">
            <h3>Pasal 5</h3>
            <h4>Pemeliharaan dan Dukungan</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Layanan Pemeliharaan</p>
              <p>PIHAK PERTAMA akan memberikan layanan pemeliharaan sistem selama <strong>${contract.maintenance_period_months || 6} (${numberToWords(contract.maintenance_period_months || 6).replace(' Rupiah', '').toLowerCase()}) bulan</strong> setelah sistem go-live, dengan cakupan:</p>
              <ul>
                <li>Perbaikan bug/error yang ditemukan</li>
                <li>Dukungan teknis via email dan telepon</li>
                <li>Update minor untuk perbaikan performa</li>
              </ul>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Pemeliharaan Lanjutan</p>
              <p>Setelah masa pemeliharaan selesai, PIHAK KEDUA dapat memperpanjang kontrak pemeliharaan dengan kesepakatan harga baru.</p>
            </div>
          </div>
          
          <!-- Pasal 6: Kerahasiaan -->
          <div class="section">
            <h3>Pasal 6</h3>
            <h4>Kerahasiaan</h4>
            <p>Kedua belah pihak sepakat untuk menjaga kerahasiaan informasi terkait yang diperoleh selama perjanjian ini, baik yang bersifat teknis, finansial, maupun operasional, dan tidak akan mengungkapkan informasi tersebut kepada pihak ketiga tanpa persetujuan tertulis dari pihak yang memberikan informasi.</p>
          </div>
          
          <!-- Pasal 7: Penyelesaian Perselisihan -->
          <div class="section">
            <h3>Pasal 7</h3>
            <h4>Penyelesaian Perselisihan</h4>
            <p>Segala perselisihan yang timbul dari pelaksanaan perjanjian ini akan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat. Apabila tidak tercapai kesepakatan, maka perselisihan akan diselesaikan melalui jalur hukum yang berlaku di Republik Indonesia.</p>
          </div>
          
          <!-- Pasal 8: Force Majeure -->
          <div class="section">
            <h3>Pasal 8</h3>
            <h4>Force Majeure</h4>
            <p>Kedua belah pihak tidak bertanggung jawab atas keterlambatan atau kegagalan pelaksanaan kewajiban yang disebabkan oleh peristiwa luar biasa yang tidak dapat diprediksi, termasuk tetapi tidak terbatas pada bencana alam, perang, kerusuhan, atau tindakan pemerintah yang menghambat pelaksanaan perjanjian ini.</p>
          </div>
          
          <!-- Pasal 9: Lain-lain -->
          <div class="section">
            <h3>Pasal 9</h3>
            <h4>Lain-Lain</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Perubahan Perjanjian</p>
              <p>Setiap perubahan atau tambahan terhadap perjanjian ini hanya dapat dilakukan dengan persetujuan tertulis kedua belah pihak.</p>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Kekuatan Hukum</p>
              <p>Perjanjian ini dibuat dalam rangkap dua dan memiliki kekuatan hukum yang sama setelah ditandatangani oleh kedua belah pihak.</p>
            </div>
          </div>
          
          <!-- Pasal 10: Sanksi dan Denda -->
          <div class="section">
            <h3>Pasal 10</h3>
            <h4>Sanksi dan Denda</h4>
            
            <div class="subsection">
              <p class="subsection-title">1. Keterlambatan Pekerjaan oleh PIHAK PERTAMA</p>
              <p>Apabila PIHAK PERTAMA tidak melaksanakan pekerjaan sesuai dengan waktu yang telah ditetapkan dalam kesepakatan, maka PIHAK PERTAMA akan dikenakan sanksi berupa denda sebesar <strong>1‰ (satu per mil)</strong> dari nilai total proyek untuk setiap hari keterlambatan, dengan batas maksimal 5% dari nilai total proyek.</p>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">2. Keterlambatan Pembayaran oleh PIHAK KEDUA</p>
              <p>Apabila PIHAK KEDUA terlambat melakukan pembayaran sesuai dengan jadwal yang telah disepakati pada Pasal 3, maka PIHAK PERTAMA berhak mengenakan denda keterlambatan sebesar <strong>5% per hari</strong> dari nilai termin yang belum dibayar.</p>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">3. Keterlambatan Pemberian Feedback oleh PIHAK KEDUA</p>
              <p>Jika PIHAK KEDUA terlambat memberikan feedback atau persetujuan pada setiap tahap proyek lebih dari 5 hari kerja, maka PIHAK PERTAMA berhak untuk:</p>
              <ul>
                <li>Menambahkan 5% biaya tambahan pada nilai termin yang sesuai, dengan batas maksimal Rp 5.000.000.</li>
                <li>Jika keterlambatan feedback terjadi lebih dari 10 hari, PIHAK PERTAMA berhak menghentikan proyek dan menuntut penambahan biaya untuk memperpanjang durasi proyek sesuai dengan keterlambatan.</li>
              </ul>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">4. Pembatalan Proyek oleh PIHAK KEDUA</p>
              <p>Jika PIHAK KEDUA membatalkan proyek tanpa alasan yang sah, maka PIHAK KEDUA wajib membayar biaya pembatalan sesuai dengan ketentuan dalam Pasal 3.</p>
            </div>
            
            <div class="subsection">
              <p class="subsection-title">5. Tidak Memenuhi Standar Kualitas Sistem oleh PIHAK PERTAMA</p>
              <p>Jika sistem yang diserahkan oleh PIHAK PERTAMA tidak memenuhi standar kualitas yang dijanjikan, PIHAK PERTAMA wajib:</p>
              <ul>
                <li>Memperbaiki sistem tanpa biaya tambahan dalam waktu 7-20 hari kerja.</li>
                <li>Jika perbaikan tidak dilakukan dalam waktu yang ditentukan, PIHAK PERTAMA akan dikenakan denda 5% dari total biaya proyek.</li>
              </ul>
            </div>
          </div>
          
          ${customClausesHTML}
          
          ${contract.additional_notes ? `
          <div class="highlight-box">
            <p><strong>Catatan Tambahan:</strong></p>
            <p>${contract.additional_notes}</p>
          </div>
          ` : ''}
          
          <!-- Signature Section -->
          <div class="signature-section">
            <p class="signature-intro">Demikian perjanjian ini dibuat dan ditandatangani oleh kedua belah pihak dalam keadaan sadar tanpa paksaan dari pihak manapun.</p>
            
            <table class="signature-table">
              <tr>
                <td class="signature-box">
                  <p class="signature-party-label">PIHAK PERTAMA</p>
                  <p class="signature-company">${company.name}</p>
                  <div class="signature-line"></div>
                  <p class="signature-name">${signerName || company.director_name}</p>
                  <p class="signature-position">${signerPosition || company.director_position}</p>
                </td>
                <td style="width: 10%;"></td>
                <td class="signature-box">
                  <p class="signature-party-label">PIHAK KEDUA</p>
                  <p class="signature-company">${client.company_name}</p>
                  <div class="signature-line"></div>
                  <p class="signature-name">${client.pic_name}</p>
                  <p class="signature-position">${client.pic_position || 'Direktur'}</p>
                </td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer-container">
          <svg class="footer-wave" viewBox="0 0 1200 15" preserveAspectRatio="none">
            <path d="M0,0 Q300,15 600,7 T1200,0 L1200,15 L0,15 Z" fill="#fff"/>
          </svg>
          <div class="footer-content">
            <p>📍 ${company.address}</p>
            <p>📧 ${company.email}</p>
            <p>📞 ${company.phone}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const printContractPDF = async (
  contract: ContractData,
  company: ContractCompanyInfo,
  client: ContractClientInfo,
  signerName?: string,
  signerPosition?: string
): Promise<void> => {
  const htmlContent = await generateContractPDF(contract, company, client, signerName, signerPosition);
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
};

/**
 * Generate contract PDF as Blob for uploading to storage
 */
export const generateContractPDFBlob = async (
  contract: ContractData,
  company: ContractCompanyInfo,
  client: ContractClientInfo,
  signerName?: string,
  signerPosition?: string
): Promise<Blob> => {
  const htmlContent = await generateContractPDF(contract, company, client, signerName, signerPosition);
  
  // Create a Blob from the HTML content
  return new Blob([htmlContent], { type: 'text/html' });
};
