import { useState, useMemo } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Users,
  Tag,
  Filter,
  X,
  Plus,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface LeadSegmentationProps {
  leads: Lead[];
  onUpdateLead: (id: string, data: Partial<Lead>) => Promise<Lead>;
}

const INDUSTRIES = [
  'Teknologi',
  'Keuangan',
  'Kesehatan',
  'Pendidikan',
  'Retail',
  'Manufaktur',
  'Pemerintah',
  'Jasa',
  'Konstruksi',
  'Lainnya',
];

const COMPANY_SIZES = [
  { value: 'micro', label: 'Mikro (1-10)', range: '1-10 karyawan' },
  { value: 'small', label: 'Kecil (11-50)', range: '11-50 karyawan' },
  { value: 'medium', label: 'Menengah (51-200)', range: '51-200 karyawan' },
  { value: 'large', label: 'Besar (201-1000)', range: '201-1000 karyawan' },
  { value: 'enterprise', label: 'Enterprise (1000+)', range: '1000+ karyawan' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const BEHAVIOR_TAGS = [
  'High Engagement',
  'Quick Response',
  'Budget Conscious',
  'Decision Maker',
  'Technical Buyer',
  'Referral',
  'Repeat Customer',
  'Long Sales Cycle',
  'Price Sensitive',
  'Early Adopter',
];

export function LeadSegmentation({ leads, onUpdateLead }: LeadSegmentationProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [newTag, setNewTag] = useState('');

  // Industry distribution
  const industryData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const industry = (lead as any).industry || 'Belum Dikategorikan';
      counts[industry] = (counts[industry] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Company size distribution
  const sizeData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const size = (lead as any).company_size || 'unknown';
      const sizeLabel = COMPANY_SIZES.find(s => s.value === size)?.label || 'Belum Dikategorikan';
      counts[sizeLabel] = (counts[sizeLabel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Tag frequency
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const tags = (lead as any).tags || [];
      tags.forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const leadIndustry = (lead as any).industry || '';
      const leadSize = (lead as any).company_size || '';
      const leadTags = (lead as any).tags || [];

      if (selectedIndustry !== 'all' && leadIndustry !== selectedIndustry) return false;
      if (selectedSize !== 'all' && leadSize !== selectedSize) return false;
      if (selectedTag !== 'all' && !leadTags.includes(selectedTag)) return false;
      return true;
    });
  }, [leads, selectedIndustry, selectedSize, selectedTag]);

  // All unique tags from leads
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    leads.forEach(lead => {
      const leadTags = (lead as any).tags || [];
      leadTags.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags);
  }, [leads]);

  const handleAddTag = async (leadId: string, tag: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentTags = (lead as any).tags || [];
    if (!currentTags.includes(tag)) {
      await onUpdateLead(leadId, { tags: [...currentTags, tag] } as any);
    }
  };

  const handleRemoveTag = async (leadId: string, tag: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentTags = (lead as any).tags || [];
    await onUpdateLead(leadId, { tags: currentTags.filter((t: string) => t !== tag) } as any);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Industry Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distribusi Industri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {industryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Company Size Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ukuran Perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sizeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sizeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tag Frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tag Populer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter Segmentasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Industri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Industri</SelectItem>
                {INDUSTRIES.map(ind => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ukuran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Ukuran</SelectItem>
                {COMPANY_SIZES.map(size => (
                  <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tag</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedIndustry !== 'all' || selectedSize !== 'all' || selectedTag !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedIndustry('all');
                  setSelectedSize('all');
                  setSelectedTag('all');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Reset Filter
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Menampilkan {filteredLeads.length} dari {leads.length} leads
          </p>
        </CardContent>
      </Card>

      {/* Leads with Segmentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads dengan Segmentasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLeads.slice(0, 10).map(lead => (
              <div key={lead.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{lead.name}</h4>
                    <p className="text-sm text-muted-foreground">{lead.company_name || '-'}</p>
                  </div>
                  <Badge variant={lead.status === 'hot' ? 'destructive' : lead.status === 'warm' ? 'default' : 'secondary'}>
                    {lead.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Industry Select */}
                  <Select
                    value={(lead as any).industry || ''}
                    onValueChange={(value) => onUpdateLead(lead.id, { industry: value } as any)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Industri" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Company Size Select */}
                  <Select
                    value={(lead as any).company_size || ''}
                    onValueChange={(value) => onUpdateLead(lead.id, { company_size: value } as any)}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Ukuran" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1" />
                  <span className="text-sm font-medium text-primary">
                    {formatCurrency(lead.estimated_value)}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 items-center">
                  {((lead as any).tags || []).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(lead.id, tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Select onValueChange={(value) => handleAddTag(lead.id, value)}>
                    <SelectTrigger className="w-8 h-6 p-0 border-dashed">
                      <Plus className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent>
                      {BEHAVIOR_TAGS.filter(tag => !((lead as any).tags || []).includes(tag)).map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada leads yang sesuai dengan filter
              </p>
            )}

            {filteredLeads.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                ... dan {filteredLeads.length - 10} leads lainnya
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
