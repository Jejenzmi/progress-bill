// Project Types for Sales Order Application

export type ProjectStatus = 'Pipeline' | 'Won' | 'Lost' | 'Completed';
export type TermTrigger = 'SPK_SIGNED' | 'PROGRESS_REPORT' | 'BAST' | 'MAINTENANCE' | 'CUSTOM';
export type EvidenceType = 'BAST' | 'Laporan Progress' | 'Faktur Pajak' | 'Bukti Potong PPh' | 'SPK' | 'Lainnya';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';
export type PipelineStage = 'Meeting' | 'Proposal' | 'Negosiasi' | 'Closing';

export interface Client {
  id: string;
  name: string;
  type: 'Pemerintah' | 'Swasta';
  picName: string;
  picPhone: string;
  picEmail: string;
  address: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  projectName: string;
  description: string;
  totalValue: number;
  startDate: Date;
  endDate?: Date;
  spkFilePath?: string;
  status: ProjectStatus;
  pipelineStage?: PipelineStage;
  terms: PaymentTerm[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTerm {
  id: string;
  projectId: string;
  termName: string;
  percentage: number;
  amount: number;
  triggerCondition: TermTrigger;
  triggerDescription: string;
  isLocked: boolean;
  dueDate?: Date;
  evidences: TermEvidence[];
  invoice?: Invoice;
}

export interface TermEvidence {
  id: string;
  termId: string;
  fileType: EvidenceType;
  fileName: string;
  filePath: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  termId: string;
  projectId: string;
  amount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  taxInvoiceNumber?: string;
  paymentProofFile?: string;
  paidAt?: Date;
}

export interface ManDaysEstimate {
  role: string;
  ratePerDay: number;
  days: number;
  total: number;
}

export interface Quotation {
  id: string;
  clientId: string;
  projectName: string;
  manDays: ManDaysEstimate[];
  hostingCost: number;
  maintenanceCost: number;
  maintenancePeriod: 'Bulanan' | 'Tahunan';
  totalDevelopment: number;
  grandTotal: number;
  validUntil: Date;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  createdAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalProjects: number;
  totalRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  overdueInvoices: number;
  upcomingTerms: PaymentTerm[];
}
