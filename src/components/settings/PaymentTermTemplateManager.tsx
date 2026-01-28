import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GripVertical, ListChecks, Save } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type TermTrigger = Database['public']['Enums']['term_trigger'];

interface PaymentTermTemplate {
  id: string;
  term_name: string;
  percentage: number;
  trigger_condition: TermTrigger;
  trigger_description: string;
  order: number;
}

const TRIGGER_OPTIONS: { value: TermTrigger; label: string }[] = [
  { value: 'SPK_SIGNED', label: 'SPK Ditandatangani' },
  { value: 'PROGRESS_REPORT', label: 'Laporan Progress' },
  { value: 'BAST', label: 'BAST Ditandatangani' },
  { value: 'MAINTENANCE', label: 'Maintenance Selesai' },
  { value: 'CUSTOM', label: 'Kustom' },
];

const DEFAULT_TEMPLATES: Omit<PaymentTermTemplate, 'id'>[] = [
  {
    term_name: 'Termin 1 (DP)',
    percentage: 30,
    trigger_condition: 'SPK_SIGNED',
    trigger_description: 'Setelah SPK ditandatangani',
    order: 1,
  },
  {
    term_name: 'Termin 2 (Progress)',
    percentage: 40,
    trigger_condition: 'PROGRESS_REPORT',
    trigger_description: 'Setelah progress 50% selesai',
    order: 2,
  },
  {
    term_name: 'Termin 3 (Final)',
    percentage: 30,
    trigger_condition: 'BAST',
    trigger_description: 'Setelah BAST ditandatangani',
    order: 3,
  },
];

interface PaymentTermTemplateManagerProps {
  disabled?: boolean;
}

export function PaymentTermTemplateManager({ disabled = false }: PaymentTermTemplateManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<PaymentTermTemplate[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_term_templates')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.value) {
        setTemplates(data.value as unknown as PaymentTermTemplate[]);
      } else {
        // Initialize with defaults
        const defaultWithIds = DEFAULT_TEMPLATES.map((t, idx) => ({
          ...t,
          id: `default-${idx}`,
        }));
        setTemplates(defaultWithIds);
      }
    } catch (error) {
      console.error('Error fetching payment term templates:', error);
      // Fall back to defaults
      const defaultWithIds = DEFAULT_TEMPLATES.map((t, idx) => ({
        ...t,
        id: `default-${idx}`,
      }));
      setTemplates(defaultWithIds);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    // Validate total percentage
    const totalPercentage = templates.reduce((sum, t) => sum + t.percentage, 0);
    if (totalPercentage !== 100) {
      toast({
        title: 'Error',
        description: `Total persentase harus 100% (saat ini: ${totalPercentage}%)`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'payment_term_templates')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: templates as any })
          .eq('key', 'payment_term_templates');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'payment_term_templates', value: templates as any });
        if (error) throw error;
      }

      toast({
        title: 'Berhasil',
        description: 'Template termin pembayaran berhasil disimpan',
      });
    } catch (error: any) {
      console.error('Error saving templates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    const newOrder = templates.length + 1;
    setTemplates([
      ...templates,
      {
        id: `new-${Date.now()}`,
        term_name: `Termin ${newOrder}`,
        percentage: 0,
        trigger_condition: 'CUSTOM',
        trigger_description: '',
        order: newOrder,
      },
    ]);
  };

  const removeTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id).map((t, idx) => ({ ...t, order: idx + 1 })));
  };

  const updateTemplate = (id: string, field: keyof PaymentTermTemplate, value: any) => {
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const resetToDefaults = () => {
    const defaultWithIds = DEFAULT_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `default-${idx}`,
    }));
    setTemplates(defaultWithIds);
  };

  const totalPercentage = templates.reduce((sum, t) => sum + t.percentage, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Template Termin Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Template Termin Pembayaran
        </CardTitle>
        <CardDescription>
          Konfigurasi template termin yang akan digunakan saat membuat proyek dari quotation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center pt-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">{index + 1}</span>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Termin</Label>
                  <Input
                    value={template.term_name}
                    onChange={(e) => updateTemplate(template.id, 'term_name', e.target.value)}
                    placeholder="Nama termin"
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Persentase (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={template.percentage}
                    onChange={(e) => updateTemplate(template.id, 'percentage', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Trigger</Label>
                  <Select
                    value={template.trigger_condition}
                    onValueChange={(v) => updateTemplate(template.id, 'trigger_condition', v)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Deskripsi</Label>
                  <Input
                    value={template.trigger_description}
                    onChange={(e) => updateTemplate(template.id, 'trigger_description', e.target.value)}
                    placeholder="Deskripsi trigger"
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTemplate(template.id)}
                  className="text-destructive hover:text-destructive h-8 w-8 mt-5"
                  disabled={templates.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className={`text-sm font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-destructive'}`}>
            Total: {totalPercentage}% {totalPercentage !== 100 && '(harus 100%)'}
          </div>
          
          {!disabled && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                Reset Default
              </Button>
              <Button variant="outline" size="sm" onClick={addTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Termin
              </Button>
              <Button size="sm" onClick={saveTemplates} disabled={saving || totalPercentage !== 100}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Simpan
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper to fetch templates for use in other components
export async function getPaymentTermTemplates(): Promise<Omit<PaymentTermTemplate, 'id'>[]> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_term_templates')
      .maybeSingle();

    if (error || !data?.value) {
      return DEFAULT_TEMPLATES;
    }

    return (data.value as unknown as PaymentTermTemplate[]).map(({ id, ...rest }) => rest);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}
