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
      <title>Kontrak - ${contract.contract_number}</title>
      <style>
        @page { 
          size: A4; 
          margin: 15mm 20mm; 
        }
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: 'Times New Roman', Times, serif; 
          color: #333; 
          font-size: 11pt;
          line-height: 1.6;
        }
        .page {
          width: 170mm;
          margin: 0 auto;
          padding: 0;
        }
        
        /* Header */
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #3d5a80;
          margin-bottom: 20px;
        }
        .header-logo {
          height: 50px;
          margin-bottom: 10px;
        }
        .company-name {
          font-size: 14pt;
          font-weight: bold;
          color: #3d5a80;
          letter-spacing: 1px;
        }
        
        /* Title */
        .title {
          text-align: center;
          margin: 20px 0;
        }
        .title h1 {
          font-size: 16pt;
          font-weight: bold;
          color: #333;
          text-decoration: underline;
          margin-bottom: 10px;
        }
        .title .number {
          font-size: 12pt;
          font-weight: bold;
        }
        
        /* Parties */
        .intro {
          margin: 20px 0;
          text-align: justify;
        }
        .party {
          margin: 15px 0;
        }
        .party-title {
          font-weight: bold;
          text-align: center;
          margin-bottom: 10px;
          color: #3d5a80;
        }
        .party-table {
          margin-left: 20px;
        }
        .party-table tr td:first-child {
          width: 180px;
          vertical-align: top;
        }
        .party-table tr td:nth-child(2) {
          width: 20px;
          vertical-align: top;
        }
        
        /* Sections/Pasal */
        .section {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        .section h3 {
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .section h4 {
          text-align: center;
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 15px;
          text-decoration: underline;
        }
        .section p, .section li {
          text-align: justify;
          margin-bottom: 8px;
        }
        .section ol, .section ul {
          margin-left: 20px;
          margin-bottom: 10px;
        }
        .section li {
          margin-bottom: 5px;
        }
        .subsection {
          margin-left: 15px;
          margin-bottom: 10px;
        }
        .subsection-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        /* Signature */
        .signature-section {
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .signature-table {
          width: 100%;
        }
        .signature-box {
          width: 45%;
          text-align: center;
          vertical-align: top;
          padding: 10px;
        }
        .signature-title {
          font-weight: bold;
          margin-bottom: 80px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          margin-bottom: 5px;
        }
        .signature-name {
          font-weight: bold;
        }
        .signature-position {
          font-size: 10pt;
        }
        
        /* Footer */
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 9pt;
          color: #666;
          text-align: center;
        }
        
        .highlight-box {
          background: #f5f8fa;
          padding: 10px 15px;
          border-left: 3px solid #3d5a80;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <img src="${logoSrc}" alt="Logo" class="header-logo" />
          <div class="company-name">${company.name.toUpperCase()}</div>
        </div>
        
        <!-- Title -->
        <div class="title">
          <h1>SURAT PERJANJIAN KERJASAMA</h1>
          <p class="number">Nomor: ${contract.contract_number}</p>
        </div>
        
        <!-- Introduction -->
        <div class="intro">
          <p>Pada hari ini, ${formatDateLong(contract.contract_date)}, kami yang bertanda tangan di bawah ini:</p>
        </div>
        
        <!-- Pihak Pertama -->
        <div class="party">
          <p class="party-title">PIHAK PERTAMA</p>
          <table class="party-table">
            <tr><td>Nama Perusahaan</td><td>:</td><td>${company.name}</td></tr>
            <tr><td>NPWP</td><td>:</td><td>${company.npwp}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>${company.address}</td></tr>
            <tr><td>Direktur Utama</td><td>:</td><td>${signerName || company.director_name}</td></tr>
          </table>
          <p style="margin-top: 10px; margin-left: 20px;">Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
        </div>
        
        <!-- Pihak Kedua -->
        <div class="party">
          <p class="party-title">PIHAK KEDUA</p>
          <table class="party-table">
            <tr><td>Nama Perusahaan/Instansi</td><td>:</td><td>${client.company_name}</td></tr>
            <tr><td>NPWP</td><td>:</td><td>${client.npwp || '-'}</td></tr>
            <tr><td>Alamat</td><td>:</td><td>${client.address || '-'}</td></tr>
            <tr><td>Nama Penanggung Jawab</td><td>:</td><td>${client.pic_name}</td></tr>
            <tr><td>NIK</td><td>:</td><td>${client.pic_nik || '-'}</td></tr>
            <tr><td>Jabatan</td><td>:</td><td>${client.pic_position || 'Direktur'}</td></tr>
            <tr><td>Nomor Telepon</td><td>:</td><td>${client.pic_phone || '-'}</td></tr>
            <tr><td>Email</td><td>:</td><td>${client.pic_email || '-'}</td></tr>
          </table>
          <p style="margin-top: 10px; margin-left: 20px;">Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
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
            <ul>
              <li><strong>Nama Proyek:</strong> ${contract.project_name}</li>
              <li><strong>Deskripsi Proyek:</strong> ${contract.project_description}</li>
              <li><strong>Durasi Proyek:</strong> Proyek ini dimulai pada ${formatDateShort(contract.start_date)} dan diperkirakan selesai pada ${formatDateShort(contract.end_date)}.</li>
              ${contract.quotation_number ? `<li><strong>List Fitur:</strong> sesuai dengan Quotation terakhir tanggal ${contract.quotation_date ? formatDateShort(contract.quotation_date) : '-'} dengan Nomor ${contract.quotation_number}</li>` : ''}
            </ul>
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
            <p>Perjanjian ini berlaku selama ${contract.duration_months} bulan, terhitung sejak tanggal penandatanganan perjanjian ini, yaitu mulai tanggal ${formatDateShort(contract.start_date)} hingga ${formatDateShort(contract.end_date)}, dengan ketentuan dapat diperpanjang atau diperbaharui sesuai kesepakatan kedua belah pihak.</p>
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
            <p>Nilai total proyek ini adalah sebesar <strong>Rp ${formatCurrencyPlain(contract.total_value)}</strong> (terbilang: ${totalValueWords} Rupiah), yang belum termasuk pajak.</p>
          </div>
          
          <div class="subsection">
            <p class="subsection-title">2. Jadwal Pembayaran</p>
            <p>Pembayaran dilakukan dalam ${contract.payment_terms.length} termin sebagai berikut:</p>
            <ul>
              ${paymentTermsHTML}
            </ul>
          </div>
          
          <div class="subsection">
            <p class="subsection-title">3. Metode Pembayaran</p>
            <p>Pembayaran dilakukan melalui transfer ke rekening PIHAK PERTAMA di Bank ${contract.bank_info.bank_name}:</p>
            <ul>
              <li><strong>Bank:</strong> ${contract.bank_info.bank_name}</li>
              <li><strong>Atas Nama:</strong> ${contract.bank_info.account_name}</li>
              <li><strong>No. Rekening:</strong> ${contract.bank_info.account_number}</li>
              ${contract.bank_info.branch ? `<li><strong>Cabang:</strong> ${contract.bank_info.branch}</li>` : ''}
            </ul>
            <p style="margin-top: 10px;">Pembayaran tersebut belum termasuk pajak, yang akan ditanggung oleh PIHAK KEDUA sesuai dengan ketentuan yang berlaku.</p>
            <p>Waktu Pembayaran dilakukan Maksimal ${contract.max_payment_days || 4} Hari Kerja setelah diterbitkannya Invoice.</p>
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
            <p class="subsection-title">PIHAK PERTAMA:</p>
            <ol>
              ${party1ObligationsHTML}
            </ol>
          </div>
          
          <div class="subsection">
            <p class="subsection-title">PIHAK KEDUA:</p>
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
            <p>PIHAK PERTAMA akan memberikan layanan pemeliharaan sistem selama ${contract.maintenance_period_months || 6} bulan setelah sistem go-live, dengan cakupan:</p>
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
            <p>Apabila PIHAK PERTAMA tidak melaksanakan pekerjaan sesuai dengan waktu yang telah ditetapkan dalam kesepakatan, maka PIHAK PERTAMA akan dikenakan sanksi berupa denda sebesar 1‰ (satu per mil) dari nilai total proyek untuk setiap hari keterlambatan, dengan batas maksimal 5% dari nilai total proyek.</p>
          </div>
          
          <div class="subsection">
            <p class="subsection-title">2. Keterlambatan Pembayaran oleh PIHAK KEDUA</p>
            <p>Apabila PIHAK KEDUA terlambat melakukan pembayaran sesuai dengan jadwal yang telah disepakati pada Pasal 3, maka PIHAK PERTAMA berhak mengenakan denda keterlambatan sebesar 5% per hari dari nilai termin yang belum dibayar.</p>
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
          <table class="signature-table">
            <tr>
              <td class="signature-box">
                <p class="signature-title">PIHAK PERTAMA</p>
                <p>${company.name}</p>
                <div style="height: 80px;"></div>
                <p class="signature-name">${signerName || company.director_name}</p>
                <p class="signature-position">${signerPosition || company.director_position}</p>
              </td>
              <td style="width: 10%;"></td>
              <td class="signature-box">
                <p class="signature-title">PIHAK KEDUA</p>
                <p>${client.company_name}</p>
                <div style="height: 80px;"></div>
                <p class="signature-name">${client.pic_name}</p>
                <p class="signature-position">${client.pic_position || 'Direktur'}</p>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>${company.address}</p>
          <p>${company.email} | ${company.phone}</p>
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
