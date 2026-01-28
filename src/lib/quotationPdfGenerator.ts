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

  // PT Zen Multimedia Indonesia official logo as base64 for PDF embedding
  const zenLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABECAYAAAApmxE5AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABOBSURBVHgB7Z0HeFRV1oDPnZKeSe8JJEAIPYQOAoJSpIgoIKDYy4qr7tp39V/L6rruuuuuXVbXgqsgCiqIgBRB6b1DEhJqCCmk98xk5v7nnglBCJCZZCbJzPc9z3NnJjO5c++9c849p1yNMGLEiBGjBFCwIJqmRUIIqWu0Dsh4jJowCiOINNqR91NKeJe0sRWkLzadqCBFhKm1EjJxZBqkSK+hPG0cT0dqNNofWFAPNL6YIYDg4+MQGxcbV1hcFLfj3C0/6XoFp8NPTL1dIvBgGVmJXEf2kFGoZSTAx+p+1NJhZB/+vuhLXIAQ8i3WiSJ8LSPZK50UUz1cJL3lYZoGGhDmJCnlCVxXIoTo2gcmTPUxCLAQOFdPVP2ZV0+wDM0JEsLCEaxiSYDVWI77F/xWDZqG94qhJYRuWkqSRB+7qLHp7V46wq5N9zIYS1KqBNMQOKd+RIIFYTrpIH2Nh+SHnDi6sQ5oiMZQrSTWdZmL8H5uqifSrM+c/LJSIWGTq1HaF8OQJJ28TJL+xd2QxCyX0LBg6aRgWBH+LgvhdXRcMBl1qfyZLCFFYhDhyQNIDZJDK6CSeEvBx65C1DyDqUUqPLYDYtAuUMPqSXgDhg5D/qihPTCPhVQCYj8cq8KShxGWDMPyV0Iy/MKfLYGJBA/YCNAQIaGEJIKvOQ1Pw/HQ0LQhOO7+hFJKQ/AcrUD9OEwJDQnJw79pHw0dj1qD0BANSwGZPRrWqiEaYlj+bJw0xEIiWAR0Jw0NOUxDjIQEFhJBYPg9oaTQkOixIQ5BDYvogWOdhIaIhqVAQ/RDQzQkAhqWkuZGQ6wmNERDokcCGhJBfqpE1BAtSZMpJCQ0JEJU0RD/NW1eNCQ0pIJpiIZIpUfTEC1LiIaFxJ9piJYkhOC4smlIeOpKJVXUhXfwZ4gfPBOxCnqqhiSEAI0NkYb4uyH+0xA/N8RfDZFSD+LvhqBp/EZoiNuQxMCYMELSeKRFQ/zdkPDUYYRk0hD/NCT81xA/10l9jJBMGhLghoSnDiMkh4aovCXQEP/VYpA0pD2MkP7UQEPaQ0M0nJD2+KMh/mxIewjpSIfqkZC0xCAXuVeKGDRE+8JjbIR08hBpiF8bIhq0IDQkINoAaIjGBsI8DQnB1kBD2kNI/ylIBLQhYaBHAhoSQHpoiJ8bEjB6aBCGBEmA6fHXhARI5YQ0bIjKV2oNQkKMxPDWQ0M0nJCOVEhVkkNDtB2aH6FJdBqiJQ0xHD2IiYYlxNMQ7R8NSQgLoSEBblp6sBQaooaGaGtC/J0Qx1Z4o4SQ8CaEpIKGBLohgW2IxhMSngppCAmI8kJDAhpiODqpiYaobhIQ0RCNI0RVEdKQNqohEX5uSAhJpYeG+LMhGkuIxhKipoT4syHBr4eSXBpixEpLa6IhEVJaQ4wQxAhJ4/FH6aAhqptIGqI+hAQqIRo7oSFGCAkeISQcDREKQ4iRPsqPYYQEjB5KVoloiNYgJI2TiNCQ9hBiFCVJSAgxKgpJYwkJdEPCQy4NCRQ9NESDCGklNMQIsSQkPDQyJMQPQkiVqLYhJDw0JCFqhJBKQ7RmISSthIao7hFSoSFaQ0i4CGnlNMTwdlJJQ7RkhIRIeoSQNqwhqosQkp6EkIIJCXE1CCFVC2JqICEhJEhCCHIpZFQ0JKEoOi/8h5C01NKQADdEVSGhhGgiNMSwCNFIQ0Ja1UIQQrQVhBD1lkgoaaSGBJQeQoKrCglph5CQkBOi3SEkJOWEkIwREqIxhKi3oSMECaEhqgvpJYS0s0tI8AjReoSQlBMSIhVBGolIDAkJFCHhoUcQpI0WQlRXCSHEsOglJCTECKlYSMMJUd0kxL8NcSsNCPkFIZpUyKBIIMgIUaUhJJWGtB5CUpWSJQrRSELU24S0B0LC/ZuQqsQQQoIkhCRJSIgaQuq6hGgjNES9DQkJaeA0RN1NCAkPIWonISFqhZBqCQkhaocQjXFCKjpC2hqnNqEhYRYS3oS0oRIQImqHkHD1NiR6CCFhJaQdhFRLCPE4IaJhQ0i7hISnZ0JDNJ6QdgjxuCGBro+G6LYhrYmG+FND2kOIehvSpggJQT2EqLMhqouGBF5DwtE2EZLGSEiYEUJCYKykISEkQEK0e0LaVJeQ8HCShIQQ1U1CVBdRmxDScEKMEFIVISEhJECEqC5+bohaCImiJaFBCCFqbogoYgkJVT2EqC4aov6GqCoaIsHxjSQkPISoKkL0ICQhqqUkJNz10RBNJURrCNEoQlSXkDALadUQ1dE4IYEgJOCEhLseogFPSCZpiNYWokYIIcFrS0hoCAm/kJAQUukhoVINV0NI8AgJMD00REsaoo1MSBi0g5CwtU1I4Ah5TwmpthJC0kpDVBciJMkJ0RhCwkOIuhoSxIaEsyFqFpIkJESEhKeIhqiGkJBD0bqEaERCgiFEi0NCQEhthPhrQ4ImJOQqDQnROEKCQw8hIdAEaIi+EtIFNETThBCl9lAVIIYE0I9fDFGbEvJj7E1IaAgJFD2EBL8eCREaqJlQNZaQQBASOA0x4ggJb0NCRYj/E+K/hgRdQ9pDyLQRQhpU04CQ0NCQUCOkXUKCr4cQ/zXEYwlpc4QEihAjJJWQAAhxhJBqCPFnQoInJDy1hIQRQkJJSDsI8WdD/NWQ4BmilqKJkNZIiJa7kJoIce0ipJWEhJCQ8CAk/ELCRIjjkZDwCGnbhIhYQ7RlQgJMD9EYQjrQkHYRYgyq1iuEBJkQzSSk3YRoOiEBIUTtCfFHKkNI+AgJFCHhIURDEuJWQrSpCAlaPdSQNkpIaAhp1RC1JyQoCdEYQsJlSEgIaRAhGk9IUAjR2iq0bkI0ihA/J0QzCAmsIWqFEKMHIe0kJCCEhJAQlRI1JESND0LSLEJaAyFqFRKehjg+Ia2HkEAQovEJUSNCwhqi2oaENnZCQiEkxHH0EKIhhCQJCXhDjBBUbUICQ0hQ66EhfmhIOxMSQqouJEiOEKLxhHhCIeoQQkLaEC0dQlqZEC1ISPhoh4hHQkJIe4RowhAS6OzFH6VSSUJC0C4hwRLiCEJCVEsSEuCGGHEIcWxC1I6QEBJybULCQ4gRogYkJERtCfE0IRo7hISNkDCpQ0iqIMRfDQlLQmookgoJ0RIkJFT00BA/NiSsJSF+aYimEhLehhihpLWEhKpVQoJFSKjpoYRoO0LCRogREkhCUkJINYT4tyGhJCT06iEkRI3wR0JUFyHBL4YEtRn8xBOilYSE+L0h4atDiKYREhJ6mGlISGuCEEJCSkiwCNFaQgJOiNoQ4r+GhLceoqOEhI8QtUNI4B8CQhIihBBH1ENDTIgRQoiGESI6bYi6GmLEIIRUJCQ8bYuQ4DRD4xFC1DSEpJKQ8NdD3JMQ/9VD1CAkmIZoqEpS6aeEqCoaEuiGhJr2/RASVjoIMQqKhkQACFHbQkJET4BIT4aQ4BMSRkLUjpDwNiS1hITgVWqEpAoh1RNihJC0ENJqCAlfHUJCCAlYQ0TqMELaPCFqhpC2T0joEKJWCAmVHkL8kJD2HBqiXoRoJCHBMySVhFRfSCAdIoS0CkJCQ0hYCWkPIe0hpBUIybEJ8UdD1JqQEBNSUUjI6CGEeJSQ9hCitYT4/SlqjZBQJ0TbSUjwCVElhDQkJNXUQUhQA/gJIaS1ERLahGiFEEJaNYSQVkVIuAhxREJCq4cQ0vYJ0ShCQqoaQoJpiFYSEpp6CCGNSEjANUQDCElVTYimEhJ+egghqpMY0l5CQqaJkDAaovWEeCohrZ0Qz4SQ4NVDLSGkJjUICaIj/EJaGyHhJcQvDVFtQjSJEJ8T0upKAghpK4QEX0O0hJDgEuJJQjSLEE8TEhhCQo8QYoSEuCEaT0g4CQlaQyoI0dqEhIUQjSKkFRGi0YQERYivCQkRISSAhISnHkJCVF1DqkdIsE4hJMCGaAYhISoklYaordBGCAkeIWoLIVJJiCMISSMhISSEpA0REiJCgtEQLSGkIWpI+AjRQEI8UB0hTYeQYBJCjBCVJcQvDWkPIUFMiGOFhNgQlYQEWEjA6SEkhIRoIiGBJiQYhKg6IWEhJNRuhaYR0r4JSbMIaVOEhNwQ/wlxLCHhNES1CfFfQtQaQrRUCAkhbYCQ8BISeEKMEBI2QrQWIRpLSADqoR0hxG8NCR0hwSNE/RISdHqIehvSwjVECxJSuZBAC2k9hIShKCIhJNVCiL8aEhoN0Q5CKgkxVN3OdoaEoB5KgkhIuAgJFz00NERzCfEwIcEmJIDFEI0mJPSEaNuEBAUh4dFGGqKdIaHphLSKElCHEK0lJFwNsRxCQkiI2kJIOxsSDkI0k5Aq1EWIxxLSCgkpJ0RdCAnJpYcQ/yQklISE0hCSJCHBbojWFUI0kpBAbUioCAm5ISqfEIOQtEaIH+olGkZIOykJICGB1hBtJySQhIQ7IcEvhCSJkHDQE4p6iAoK8S9DVFsNoRoSQkOCQkg4E6I2hISaEDVISOgJoaQthIS6qLqGhIqQABKiZoZoNiFhL4T4K0VhIiRUhMhJQ4JVDy0hJIyEOLoh/mtImAgJB+0gJJVCQkkPIYGuh5CqCfFbQ0JJCEkSEvCGaJgQ0mZIiIgJOSHhJiTshLDQEEJCQkOCR0gbLIR4mhCNJUStqCGhN0TzCfF0QoJ/CxNCiGMREvyGqL+EEBU0xHchxCgJCToh4aibJCTkhDQkNMRhRK0QEmLC1JAQDSKktRISJkJCR4jHEhIqQoL4hBASAnpoiPoK8TND/JqQsDoSSBpESHgICVY9xLZpSEgIIYFvSLAJqZIQPzQkmIRoAiFqeOoRQjSMEJcTohaGhJQQbRwhrZWQ9l5CUgUhbYGQBhES/IaEMyEhI8TJhBCDENJuQjScEJcSEjBCNJYQf9RDI5IQR0MIaU9CwiOk7RGisYS0WULaNCFtlpBQEdJaCAkRIcF0hARCSCr0EBK4hEiYhBB3E1LVhuiuIZpJSGgIaSUhJMCENEhIIA2xf0JC1NCQ0BISnIZoFCHthxC1J8SfDQnTkOoJCR4h4SREVdMQNSYkWIQEzxCNJKQthISfEDVCSAAJacaGNEYJaY+G+JGQ1kJIayMkkA0JFiFaT0g4CAl+M4SnIcGph0YT0joI8V9D1JCQ4NVDIwkJCSEhq4eQEDVCOwkJpSFqhZBwGRJKQoJliOoQ4ueEhIWQNkMIUXEhUg8hKm9IqAkJACHBaUhrJURVhYSKkCAIaV2EhLIhEgJCwklIew4h4SFErRASVCEBboiGEuIHQjSckIpCfEiIGhtiIoQQR1ENCVFdNCgNCb2QEBLSLg3xkJDwCHE8IYEjxF8NURtC1Ey4mtRK2mNCjIREQ0jrICRkhDgeIYEkJFiGBD8hmqiGhKEhJCwNIaqHELVDiJoQ4leGhBMhGk+IWhsS0EeJEJLGEELaIyF+bohqCSGqiJD2SEgbJyS8DQk/IYH1Ikc1JMwNUdMlJDiGqFVD/DhC2rYhQSbECNEAQvzZkPAa0moJ0UhCAk1ICBpCWjshakaIaglJJQ0JHSHhJCQQhWgyIZpLSIgJCXdDVEWI/xGiuogqEuLH55K0d0JaByFhLIQYIaSCkPAKCR0hxCgBJqRth4aklyIxJKyERCUhgSKksaUhaouQ0NLDpHZCNJIQfzQkJISocoq1Q0g4CVGTIYRoOCFq05C2UBMxJByEeDQhakkISSoNaQ+EaD0haodmCNFSIUQDCHE0IeoPISkwJNz0EP9oDSGhMcT/hFRQKSGhaIhz0pAQ0RD/JCQ87dB8QsJeDw1vQ4iNEBJsQvxXDw01IZpGSEgb4reEqGpDfNMQNSKkgYaoe0lACAleQzSvEOIHIUZISAkhEmuIepdEhZAQQtwmxLGEhIYQRz8kJISEkCAnRFUJMUJIiAgJDT00I4R4mhCNJMRzDVEjhqgGIZopJMCEtC4hEhBCQkNIMBxCVJEQP9dDlBAS3qIICSEhgdUQDSWkHYa09+bxNCHhIIQYISGth5DQC3FcIYEnJMAJIWpETxNCyukhqosQTyREK/xQCQm8kJAQooGEEMcQog4ipC0KCSchGloPtRFCREJCDAlnQ9SMEJUNIUQDCPHLbfH8RogqIkTtCQl/PcRTCSkuJHT10ODUQzxFSGSEBJEQ9SFE3VABIVpAiNYWQ0jlhFRJiMoIUR1CQ
kOIfxoSOkJaLyGpN0S1DVFDQ1SVEL82JLSEEBJMQoJQDz8hJC0bEnxCTIRoAiFhJyQghLQeQoKSEH+WCEJURogq0NAQQkIaQ0h7C6kaIW2GkGAb4h4hISEkZIaoIiFqQEjoCdG6hISGEH82JCCEBIN2CNGcQojitkMNCUdCHLYhqoOQ4BuSKkKCR0hwDAnvbRpIiL8T0lYJCRshJIQNURVCQt8QUpkQUsEfCCFBJyQYhqgFIZoohFRFSBA0xPmEhLYeGioh9Qghqhwh/mmIVhaiuoaoHiHhoIdqE+LnhqghIW3mMuSBhPinIWpCiJoREuqGhLYe4h4hIU2IHwkJfkPUGiFBpsdxhKhNQ1RaD41NSIj1EP82JGyEECPECCGJhIQQ4ueGaD0hPk+IWhBCVJMQ4n5CNK0h4SCEL4RoLCE+MCQ4hISMEEcT4p+GhJQQIwQpFRLAhhghJNQNMUJIIBrilIRoYyYk0A0JKSF+SYgaEeJAQ/yTkNAQEtR6aBghISekHYaEuB6BJ8RzDdFAQgJCiBFCNLohjkuIv1MkIQQZIYFsiNolJLz1ECEhJCT0Qog/EqKRhIR5Q6oiJHD1EJI+IQFoSEgJCWRDjBIhISSQhmg6IeElJM3qoeaGkDAaomGEqGNCwtoQIyQQhPgjIYEkJDiGaAwhISTEPw1RY0I0kBD3E0ICT0jI6xEMQsL8LDFEDQgJSUM0kJAgEOKnhKg/IcFvCDFCQkxI0BNCSE5IayWEqJgQP5VEYxuiQYSEnpBQN8RDhLQhQvxHj/86QkJCiKohJMQN0RZCQkOIvxMSnoaEsiGBLYaEpSEaQ0hoCAl/Qxw1IaEeEoaGhEZIoGnoIKRV0UOCJyTcDdFSIZpOSCgaYoSQJCFhhpDANkQNCHE8IZpBSKgJ0VZESBgJCRohWkdI0AgJCULCQ0goDSHBIyQshNR8CGkPIRqXEE1siHoT4sd6iDoSQvxFSOshJASEBDkhFYR4mJCQPEmksiHhJiSsDWnrhISeEBJCQlSRECMklIS0MyEhIUQDCQmiIVpLSKDpoZl6CDEhJJSE1FVDNI0QPySknYaEhBBNJyQEhISSEOJBQlqNEKJxhGh9IaQiQoJrSCgJ8TQhYUxImAhJvSFhaogRQqokhGgiIQ4xRK0ICbwh5YQERYQQ0koJIW2fEKP8mRBCWhchgXeE+LMhfoqQEBMSVLokIYQYISSVhGghIUYI8TMhIapH8AnRQELChpCQNkStCCFGCGkTDQl0PfzeEH8kpB4h7dBDgqaHEBqihBCihhNCwkFIIOqhUkL8U4jjE0JCTkhAG6LahJhIaApRe0JCR0go6qGxCQkFIe0h5JcN8RshKSbEU4SQgBMSHEI0lpBAKSEBIqQyQtRkCEmNJqoqJNT1cEwhJIBCSFohxPOEBJ6Q4BBCQkpIoA0JDSHBJqRVENLGGoLfEF8Q4ueE+D0hFYSEgZDQEBLYQogRQsLRkJAQEnxDVJ4QYoQEv5BUF0JCSkg4G6LBhBhJCEn0EBKkeoQQEg5CSAgJaVUNMUJIehqisYQQPwlxhJAgF0OIehMSHHpoKCHhIySwhoQHIYEnJHT1CAEhJg0hIafHTw1Rm4bUN6R1EBJeQsLfkPAQohJCfEIICQ0hISck6A3xE0JCS0j7DglHPZxNiBoQIu1ISFgJCXpDVNsQ/9dDiBFC0lJDwkOIVhISaEI0siGqR0igGuLXhgSOENVO0kRI2AgxQlSfkFAS0mYJaWOEhK8ekk5CiGcJCVFDNMIQ/wlxNCHaCAkhIaRiQ0JLSDD1EBpCVJkQIyQIDQlTISSshCRJCPF7QpxHCGkdDQn0XyMBJERNCAl8Q0KNEBJCemiFkBAQ0kBC2i4h4SYkbIYE4rg0JKxCSJohJMCESCZCSKojpN2EBEMPTSOkPYS0NULUjBBNIoQEuiEaSkjQCdF4Qlo9If6th9sTQsJFCAkNIW2YkPAQ4gghqogQ0g5CQkJIKOoh/hfiZ4SELCFB/ZVIqxNC/N0QtSSE+DchxAhxNCEaSUhIDSFqQojaEuK/hKS6kBAQ0uoJCXRD1JYQEm5CNJwQEkpC1N8QPzck/IQEjRDSWggxQoKdkLAb4m8hhISeED8R0jZDYoSQ0NXDxULQEBIoQjyFkCAQ0u4I0YkR0ioJCW09wtUQ4i9CtI2REBMSUkJU3hBNI6QdhrQlQuonJJCE+K0hoTfE5UJIkAnxJCGaQ0g4CAklIQ0ipJ2GpC0S4u+GhJAQfxhCQkOISkKC3hAjhPiakJAS4pOGhIsQIwRJI8QxDQmKEM0mJNCEaGJDNJcQzSck0PXwW0NCbIhGCCEhJCT0hpBQ0yP8lEsICSU9ghWi7YaQgBBC/JCQ9hAS8nqoNCEhJkSlDdF4QjyfEI0ghKSJhLjCEP8lRD0I0XRCNJqQ8BJCVFtIGAypjhC/N0T1CAlqQ5xPiKoLCWk9HOtXoiGk4YQYISQIDQmdhJAgERKmhqg2IRpDiM8MCRM9tJ4Q/xGi8YQE+0miZg0hJFSEqDMhrYGQwBriOUKI5wjRHEI0mZBgGRKahDi6kAoICXY91JCQ8BNS14TIK4SEipBgCglxQ0J7OQmMIYEgpAJC/NYQDSIkMPXQGoQQ//1Uxj8N0UwhxPcJCWlDNCgJCbIhRkgqDAlePVSdkPATovaEhI6Q0JYEhISIkPAQEoqGhDYhQTYkyPXQBoaIehISbELCdJsf8glxvCEhJ8ThhKgxIfVoSIAbEvqEaCohrdcQNSAkhPQQbR0kJPDFEKJxhARCiMcIIR4jJGSEqBJCHN2Q0BFCWk1D/JqQgBPSegjRREJCR0h7DCHECAmVIeIvQjSXkLpviDoZ4peE+JeQ8CdEExoSLEJCTUiQDQl/IWrQEFE7QrRthKhZQyy0IYQEnBAPEkLaICFqQojakobUPYT4OSHhI0TT/JCQ0DQkPPS4jJCQ00Nc3hATIe0iRDMJUdmE1EaIWjWkckJCYIgYISFGSGCEJAkJsiFhq4c1CdFCQkJPSLgNCTchWkhIyBqiNg0xQpDUQ0hlhEg4EuLSdoRMCzFEVQlR2wkJYkP8lpDwF0PaICHhLImkhxC1LYQEiZC2UxLgYog2ICT8DQkTISH2R0L8lRANIoS0AkJCVg8xlxA/N0R1CdFqQkJS+CMhIUBIWBii9YSErCEBJ0TjCOkIIe0xREMJCVxDNJgQNSYk/ITUJYSoCCH+KEoMCRchgTfED4SEtR6SWkLCQEjIGqKphARSSFshJKSE1LeQVCckIISEiR7hrUc9CGlXQ1SLEOIeQnQ9IeoQ4mhC1M8Q0haE+Lch/iuGtIqGhKoeKSIkJIYYIaRShKg1Ia2MkFDXQ+UJ0fqGkFA3RMMIIYFuiBFCQl0PdUtIyAkJR0NaByHtNkT1CdEqQvyZkLZNiAkhJHCERIYYIaRKQhoZQoJniP8SQhJJSJgJCQ0hPiJEDQkJHyEeIKTVkIQQUhWhNg0JuSH+SojqEdLuQsJCSGgMIS0kJOSEhJIQbTghoc8JCakhqoKQ9hqitoQQzxCiWkJI2BqiEYSEnxANJyTEhOg+IQ0lJMSEhKEhqmlIuhNijIQQPzZE5QkhRgipiBC1b0hQE6IphKgjIaJxhGgcIcE2JESKEA0kJLgNURNCwtmQgDYksEJISAyJ6hriJ4SEj5BQN6TxCdFKQoJAiIkhJCiElBMSBCEqTYhaEOKXhqhsQjSFkJARomGEeI6QYBqizoSElRAtNIRoMyHtNYTUJYYEhZAQ0kMNCQk9IcE0RPUISZOR8AgJF0JUmhCSKkKMkJDbIpUSEj5CAiXEYwlxDCFqI0TTCQkNIeE3JPyEtJaQVklIaxNiIDNCgk+IWhMSWkK0lJBKm4bURIjq0kOkXoSElpBgkxKiJoT4uR5qREjQHRLaJCHhJES1E1IJIR4nJNwNUVtCgutIiAnJJISEwBBtlhBNJCQ0hKhZQ4z4m5CQE6Kxw0OXkMD+h/aekHAXQlwfQlq/EA0iJBWE+KUhqpEQ4kmE+I6QINXD3wlxoJCwEhKqhoSYEP80xF8JCT0hqgMhGj9CNCxCAkKIOhHif4SErSF+TYifCFE3QtoMIe0hxH8NCRUhoUxIoA0JCy/pIYS0MkLU3JCaEBKGIaHXQ9WcEI0hhPS3If5piNoR0ioJCR4hYStJaw0h4bxL2lsIcYMQdStJCiFqTUioCQmSIRGtR9sTIuqEkIoIIU1BCCEkNIRURoh6ExJaCCFhb4jv6qGBhNQ8ISrNEI0lJPANIe0iRLWE+KEhGoQTQsLTEE0kxI8NCY+Qxjck/ISop0pShxASdELU0xASakJCQ4gEg5D2HBJiemgUIW2FEL80RIMJcb0hwSUkHCWBICT0DVFNQuolJJyEqBFCSFANCR8hxkMI0dB6pIqQ4BESwIaoLSHBaYgaEaKJhASnHsRzCOlRFyHEN4Tok5CQ/5eQ6k9C2hkhmu6H+FtIyAghIW+IxwlRGSHtMaQt0BNUQkJPiCYR4m5DNJoQzWyI+hESMEJC0JDAGhJsQlROiLsI0ewYos0J0egQ0pYIIf5tSPiLAl4PdSIkNASRJCHEr4SoLiHu+s+G1HZCtHJCNKchKmmIR4eQCCbEPw3ReEJCTUi4GhI4QjSREHUPIS0lpN2EqN0Q3yEkaPVIT0NCWo8QNkR1CfFrQ0KHkPAQotaE+IwQdSFE4wlRU0I0lZDwERIqQlolIaE3xJP0cDVE2wohhKgqIalDiCcJIRpOiJoQ4qFiiJYS4jhC1B5CNIOQkNdDNJAQ/zSEaA4hqmRIiAqpQkj7CAnXE6LqCVEJIW2cEPU3ROsLCSE9hLQxQkJliBqR8BHSdghRHUL81xANJoRoNCH+a0i4/kK0rRASOkJI4wmJGkJUV4gJIfU0xJ8NUZUQYoQEtB6OHEK0gZDQENLGCFFvQoJNiB4R0n5CjFR4CAlWQ9zQEGJHSKsjJESE+Jue4AsJNSFqTcifG+KnhqgVIWEkJKyGqC0h4SVE4wlxqSEqS4i2FUK0oRBaGyHaPCGtjJCWExJoPfzcEJIkIa2IEHUhRFWFaD0hIdZDjARaiGoTEpqGaC0hbYeQuhLie0LCRQhpY4T4vyF+T0hQCAl0HaI/FEI0JoRo4whRNUIaaIgaEqIGhLSCEBJaQ4wQQsJqSKsSYiQSDFEHQhoihLQKQtqKEHUlxBP0CEBCdJ6Q0BPSPkPUjxDiLUJUGyFqFEICTkidDWl1DQmKEN8VorYQEuyGaC4hpM0ToqaEtP+GhICQVkpIqOuhWoR4ihA1S0iIGqIahEgqIYFtiOoSEqiGhKgh4SNEY
wmJHCFqb4gfGhKshkgqISQghLQ2QsJRDyNEtRDS/hsS9JLUICHqQEioGuJBQrRLSCYNaS2EBMcQogEkgSLEcYQQ/yZEnQghUk2IJhDStglR04aQNkdI6woJdT2IxhPS/hsS6noQl9RDK/1Pw0QISQEhAUVIiAoJNyGaz0PaLyE6EKJqhNSHkLASEvSGpJYQbSwkNISkHULqbEhgGyJ1ISRUDdGCQvzUEI0kRM0I0XhCgiNEuxOi0fWQioaE35Aw0UNCIYS0fkLCQw8tbEgQ6qGqCAmFkDYfQoJVEnVNSCCEhNMQrUFIsA0JHiEkOIa0EULCQ4gGlERdCQlOQ4gmEtJOQtSxIeolpN2EeI6QMBnSXgjR/oTUixCNIkSlCAkHIf5MSDsa0moI0ZKEqKchpO2REBLSwIRooiGkVRCieoSEviGBoYcqEhIaQjpNCKm6EOLPhqixIcEhxK8NCZwQNRFC2ighJHUI0RJCakJIGBlC0hohar0JaYshpB2GhKoh6kWIhhCisYaIFBLiK0JUtxBSPyFqJSTcDUn3hIRNCNECQoJpiF8JaVeE/D9E2gohxC2EpD5C2h0hIWsIaRNCNJYQ4mtCgtEQdaohxLMNCYmQGv8novaEBJKQCAkJDSH+IqQ9S0h4CGlHQjzVkLAQ0goIaT0h7diQ1kdIuwhpN4Roa0LUtiGuDyGEEC0kpP0TUrsh/iWkPQjxVELaFCGB1iNNhKgdIT5tCNFwQkJFSLgapkmEBNOQdhJS+7oEipB2E1L3hrRCQtrBkHAQ0npC2gMhJKCEqIaQ8BGiYYSoOSF+a0i4GeJrQkINIWoqJMSGhFEPx/lJQoJNSCAJ0VRCNJ4QfySkOkLCY0g4EuLHhoQ2IeFpiEoT0p4IaR2EhLIhIWqI2hBC0kKI3xriR4ZIJSE+JqRdEOLxhISqIe0khISOkHYQQkJOSGgjpLUTov6EqJGQ4JdEXQgJuCHqRIgGEuJyQjSZENdNiIoTItWEhLwhmk9ICAjRJELCTEhqDGl3hLSbEI0xxD2EhLweRggJNSFpghC/N0T1CdFoQsJHSPsNUX9CCAnJZkI0hJDQ10OlCAl9Q0JOCPEMIQH8GxJCglhIdYS0d0I8SkiID0JCCwkhqoMQNSOkNRDiT4QEo5C6EaJ1JCTF/0xFVZaQEBMSOkI0npBWS0h4CUktQppKSNskoQ2pQ0gNhISyIWGsh6YSon6E+J+QcDZEBQlR+4a4m5DgN6SuCQkZIWqKEPU0JMT1IMRfCGk1IaQ9hoSakFYfQtpJiAYSoi6EaA4hxMkT0sJC2gMhJL2EqIwQjSWk7YdoNiFqRUg7CKkHIa2DEH81JHSERExISAgJQ0PUmhCNNSS4hKgJIaEmhATSEBcL0fqEtOuQ8BAS2oaoLCGhJkT1CAl1Q0JDSPuEENJ+CMlMQhJKSLsN0URCSHsTovqEBKchYRNCgkeI/xoSInpoNCHhIURrhZB0hhCiqoSoJiEuNETtCQnNZYaEpB7qRYgaEOKXhqiRhLQtQoJNSFgbopaEhI8QI4S0gxC1NMS1hKSekPYREkRC2kUI0W5CQk2Iuhii1Yi0SkJUNcS/DQlBQ0JHiD8bot0ICQkhKm5ISOqhlYSEtSFqZUhoGxLaehANJYSoICH+aIjWjRBJJyT8hIRLSOgNUU1CNIaQVkZIWBgS1IRoQ0LaZIimCGl9hHjOEI0kJJSEhMsQ0jYJaRUhwSTE7wkJByH+SGR4CAk9IfUgpF2EkHQREgxCgk2IGtZDowlpB4QEwxCPE6IxhIRGDwmakPYQ0s5DQlkP/yQkcYZoECHteIi6GhImQkJEiP8a4ihCNIwQdTck+PUIGCHBIyQEdYg2IiRIhoS4IcEhJCT1ECMk6IS0PyGhMkQ1CWkHIWrYEFUREvL/EFrz7B4AAAAASUVORK5CYII=';
  
  // Use logo from settings if available, otherwise use embedded logo
  const logoSrc = company.logo_url || zenLogoBase64;

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
          align-items: center;
          padding: 15mm 15mm 10mm 15mm;
          gap: 15px;
        }
        .header-pattern {
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, #3d5a80 1.5px, transparent 1.5px);
          background-size: 8px 8px;
          mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0.5) 50%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0.5) 50%, transparent 70%);
          flex-shrink: 0;
        }
        .header-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-logo {
          height: 50px;
          width: auto;
        }
        .company-name {
          font-size: 14pt;
          font-weight: bold;
          color: #3d5a80;
          letter-spacing: 0.5px;
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
            <div class="company-name">${company.name.toUpperCase()}</div>
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
