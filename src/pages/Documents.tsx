import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockPaymentTerms, mockProjects, formatShortDate } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Upload, FileText, FileCheck, Download, Eye, FolderOpen } from 'lucide-react';
import { EvidenceType } from '@/types';
import { cn } from '@/lib/utils';

const documentTypes: { value: EvidenceType | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'SPK', label: 'SPK/Kontrak' },
  { value: 'BAST', label: 'BAST' },
  { value: 'Laporan Progress', label: 'Laporan Progress' },
  { value: 'Faktur Pajak', label: 'Faktur Pajak' },
  { value: 'Bukti Potong PPh', label: 'Bukti Potong PPh' },
];

const typeColors: Record<EvidenceType, string> = {
  SPK: 'bg-primary/10 text-primary',
  BAST: 'bg-success/10 text-success',
  'Laporan Progress': 'bg-info/10 text-info',
  'Faktur Pajak': 'bg-warning/10 text-warning',
  'Bukti Potong PPh': 'bg-muted text-muted-foreground',
  Lainnya: 'bg-muted text-muted-foreground',
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EvidenceType | 'all'>('all');

  // Get all documents with project info
  const documents = mockPaymentTerms.flatMap((term) =>
    term.evidences.map((evidence) => {
      const project = mockProjects.find((p) => p.id === term.projectId);
      return {
        ...evidence,
        termName: term.termName,
        projectName: project?.projectName || '',
        clientName: project?.clientName || '',
        projectId: term.projectId,
      };
    })
  );

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.fileType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by project
  const documentsByProject = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.projectId]) {
      acc[doc.projectId] = {
        projectName: doc.projectName,
        clientName: doc.clientName,
        documents: [],
      };
    }
    acc[doc.projectId].documents.push(doc);
    return acc;
  }, {} as Record<string, { projectName: string; clientName: string; documents: typeof filteredDocuments }>);

  // Stats
  const totalDocs = documents.length;
  const spkCount = documents.filter((d) => d.fileType === 'SPK').length;
  const bastCount = documents.filter((d) => d.fileType === 'BAST').length;
  const progressCount = documents.filter((d) => d.fileType === 'Laporan Progress').length;

  return (
    <AppLayout title="Dokumen" subtitle="Repository dokumen proyek (SPK, BAST, Faktur Pajak, dll)">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Dokumen</p>
              <p className="text-2xl font-bold">{totalDocs}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SPK/Kontrak</p>
              <p className="text-2xl font-bold">{spkCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">BAST</p>
              <p className="text-2xl font-bold">{bastCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Laporan</p>
              <p className="text-2xl font-bold">{progressCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen atau proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as EvidenceType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter Jenis" />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Dokumen
        </Button>
      </div>

      {/* Documents by Project */}
      <div className="space-y-6">
        {Object.entries(documentsByProject).map(([projectId, data]) => (
          <div key={projectId} className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">{data.projectName}</h3>
                <p className="text-sm text-muted-foreground">{data.clientName}</p>
              </div>
              <span className="ml-auto text-sm text-muted-foreground">
                {data.documents.length} dokumen
              </span>
            </div>
            <div className="divide-y">
              {data.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('status-badge text-xs', typeColors[doc.fileType])}>
                        {doc.fileType}
                      </span>
                      <span className="text-xs text-muted-foreground">{doc.termName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(doc.uploadedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">by {doc.uploadedBy}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(documentsByProject).length === 0 && (
          <div className="text-center py-12 rounded-xl border bg-card">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tidak ada dokumen ditemukan</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
