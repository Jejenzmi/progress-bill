import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Trash2, Edit, Loader2, Check, Star, Copy } from 'lucide-react';

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  party1_obligations: string[];
  party2_obligations: string[];
  standard_clauses: { title: string; content: string }[];
  maintenance_terms: string | null;
  confidentiality_terms: string | null;
  dispute_terms: string | null;
  force_majeure_terms: string | null;
  sanction_terms: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  party1_obligations: string[];
  party2_obligations: string[];
  standard_clauses: { title: string; content: string }[];
}

export function ContractTemplateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    is_default: false,
    is_active: true,
    party1_obligations: [],
    party2_obligations: [],
    standard_clauses: [],
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed: ContractTemplate[] = (data || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        is_default: t.is_default ?? false,
        is_active: t.is_active ?? true,
        party1_obligations: Array.isArray(t.party1_obligations) 
          ? (t.party1_obligations as unknown as string[]) 
          : [],
        party2_obligations: Array.isArray(t.party2_obligations) 
          ? (t.party2_obligations as unknown as string[]) 
          : [],
        standard_clauses: Array.isArray(t.standard_clauses) 
          ? (t.standard_clauses as unknown as { title: string; content: string }[]) 
          : [],
        maintenance_terms: t.maintenance_terms,
        confidentiality_terms: t.confidentiality_terms,
        dispute_terms: t.dispute_terms,
        force_majeure_terms: t.force_majeure_terms,
        sanction_terms: t.sanction_terms,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      setTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      is_default: false,
      is_active: true,
      party1_obligations: [
        'Menyediakan tenaga ahli yang kompeten dan berpengalaman untuk pelaksanaan proyek.',
        'Menyelesaikan proyek sesuai dengan jadwal yang telah disepakati dalam perjanjian ini.',
        'Memberikan dukungan teknis dan pemeliharaan setelah sistem selesai dibangun.',
        'Menyediakan dokumentasi sistem dan memberikan pelatihan kepada pengguna.',
      ],
      party2_obligations: [
        'Menyediakan data dan informasi yang dibutuhkan oleh PIHAK PERTAMA untuk menyelesaikan proyek.',
        'Melakukan review terhadap hasil kerja PIHAK PERTAMA sesuai dengan jadwal yang disepakati.',
        'Membayar biaya proyek sesuai dengan jadwal pembayaran yang disepakati.',
        'Menyediakan akses untuk pengujian sistem di lingkungan PIHAK KEDUA.',
      ],
      standard_clauses: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      is_default: template.is_default,
      is_active: template.is_active,
      party1_obligations: template.party1_obligations,
      party2_obligations: template.party2_obligations,
      standard_clauses: template.standard_clauses,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (template: ContractTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      is_default: false,
      is_active: true,
      party1_obligations: [...template.party1_obligations],
      party2_obligations: [...template.party2_obligations],
      standard_clauses: [...template.standard_clauses],
    });
    setDialogOpen(true);
  };

  const confirmDelete = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Template berhasil dihapus' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Nama template wajib diisi', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_default: formData.is_default,
        is_active: formData.is_active,
        party1_obligations: formData.party1_obligations.filter((o) => o.trim()),
        party2_obligations: formData.party2_obligations.filter((o) => o.trim()),
        standard_clauses: formData.standard_clauses.filter((c) => c.title.trim() && c.content.trim()),
        created_by: user?.id,
      };

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('contract_templates')
          .update({ is_default: false })
          .neq('id', selectedTemplate?.id || '');
      }

      if (selectedTemplate) {
        const { error } = await supabase
          .from('contract_templates')
          .update(payload)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Template berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Template berhasil dibuat' });
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Obligation handlers
  const addParty1Obligation = () => {
    setFormData({ ...formData, party1_obligations: [...formData.party1_obligations, ''] });
  };

  const removeParty1Obligation = (index: number) => {
    setFormData({
      ...formData,
      party1_obligations: formData.party1_obligations.filter((_, i) => i !== index),
    });
  };

  const updateParty1Obligation = (index: number, value: string) => {
    const updated = [...formData.party1_obligations];
    updated[index] = value;
    setFormData({ ...formData, party1_obligations: updated });
  };

  const addParty2Obligation = () => {
    setFormData({ ...formData, party2_obligations: [...formData.party2_obligations, ''] });
  };

  const removeParty2Obligation = (index: number) => {
    setFormData({
      ...formData,
      party2_obligations: formData.party2_obligations.filter((_, i) => i !== index),
    });
  };

  const updateParty2Obligation = (index: number, value: string) => {
    const updated = [...formData.party2_obligations];
    updated[index] = value;
    setFormData({ ...formData, party2_obligations: updated });
  };

  // Clause handlers
  const addClause = () => {
    setFormData({
      ...formData,
      standard_clauses: [...formData.standard_clauses, { title: '', content: '' }],
    });
  };

  const removeClause = (index: number) => {
    setFormData({
      ...formData,
      standard_clauses: formData.standard_clauses.filter((_, i) => i !== index),
    });
  };

  const updateClause = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...formData.standard_clauses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, standard_clauses: updated });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Kontrak SPK
              </CardTitle>
              <CardDescription>
                Kelola template standar untuk kontrak kerjasama (Hak/Kewajiban, Pasal)
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada template kontrak</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      {template.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{template.party1_obligations.length} kewajiban Pihak 1</span>
                      <span>{template.party2_obligations.length} kewajiban Pihak 2</span>
                      <span>{template.standard_clauses.length} pasal tambahan</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!template.is_default && (
                      <Button variant="ghost" size="icon" onClick={() => confirmDelete(template)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template Kontrak' : 'Buat Template Kontrak Baru'}
            </DialogTitle>
            <DialogDescription>
              Atur default hak/kewajiban dan pasal standar untuk kontrak
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Template *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Template Standar SPK"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi singkat template..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
                    />
                    <Label>Jadikan Default</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Aktif</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <Accordion type="multiple" defaultValue={['party1', 'party2']}>
                {/* Party 1 Obligations */}
                <AccordionItem value="party1">
                  <AccordionTrigger>
                    Kewajiban Pihak Pertama (PT Zen) - {formData.party1_obligations.length} item
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {formData.party1_obligations.map((obligation, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <span className="text-sm font-medium mt-2 min-w-[24px]">{index + 1}.</span>
                          <Textarea
                            value={obligation}
                            onChange={(e) => updateParty1Obligation(index, e.target.value)}
                            placeholder="Masukkan kewajiban..."
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParty1Obligation(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addParty1Obligation}>
                        <Plus className="h-4 w-4 mr-1" /> Tambah Kewajiban
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Party 2 Obligations */}
                <AccordionItem value="party2">
                  <AccordionTrigger>
                    Kewajiban Pihak Kedua (Klien) - {formData.party2_obligations.length} item
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {formData.party2_obligations.map((obligation, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <span className="text-sm font-medium mt-2 min-w-[24px]">{index + 1}.</span>
                          <Textarea
                            value={obligation}
                            onChange={(e) => updateParty2Obligation(index, e.target.value)}
                            placeholder="Masukkan kewajiban..."
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParty2Obligation(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addParty2Obligation}>
                        <Plus className="h-4 w-4 mr-1" /> Tambah Kewajiban
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Standard Clauses */}
                <AccordionItem value="clauses">
                  <AccordionTrigger>
                    Pasal Standar Tambahan - {formData.standard_clauses.length} item
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {formData.standard_clauses.map((clause, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Input
                              value={clause.title}
                              onChange={(e) => updateClause(index, 'title', e.target.value)}
                              placeholder="Judul Pasal"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeClause(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Textarea
                            value={clause.content}
                            onChange={(e) => updateClause(index, 'content', e.target.value)}
                            placeholder="Isi pasal..."
                            rows={3}
                          />
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addClause}>
                        <Plus className="h-4 w-4 mr-1" /> Tambah Pasal
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedTemplate ? 'Simpan Perubahan' : 'Buat Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template "{selectedTemplate?.name}" akan dihapus permanen. Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper function to get templates for use in CreateContractDialog
export async function getContractTemplates() {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map((t) => ({
    ...t,
    party1_obligations: Array.isArray(t.party1_obligations) ? t.party1_obligations : [],
    party2_obligations: Array.isArray(t.party2_obligations) ? t.party2_obligations : [],
    standard_clauses: Array.isArray(t.standard_clauses) ? t.standard_clauses : [],
  }));
}

export async function getDefaultContractTemplate() {
  const templates = await getContractTemplates();
  return templates.find((t) => t.is_default) || templates[0] || null;
}
