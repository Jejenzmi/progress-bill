import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus } from 'lucide-react';

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nama klien wajib diisi').max(200, 'Nama terlalu panjang'),
  client_type: z.enum(['Pemerintah', 'Swasta']),
  address: z.string().trim().max(500, 'Alamat terlalu panjang').optional(),
  pic_name: z.string().trim().max(100, 'Nama PIC terlalu panjang').optional(),
  pic_email: z.string().trim().email('Format email tidak valid').max(255).optional().or(z.literal('')),
  pic_phone: z.string().trim().max(20, 'Nomor telepon terlalu panjang').optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: { id: string; name: string; address: string | null }) => void;
}

export function AddClientDialog({ open, onOpenChange, onClientCreated }: AddClientDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      client_type: 'Swasta',
      address: '',
      pic_name: '',
      pic_email: '',
      pic_phone: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setSaving(true);
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([{
          name: data.name,
          client_type: data.client_type,
          address: data.address || null,
          pic_name: data.pic_name || null,
          pic_email: data.pic_email || null,
          pic_phone: data.pic_phone || null,
        }])
        .select('id, name, address')
        .single();

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Klien "${data.name}" berhasil ditambahkan`,
      });

      form.reset();
      onOpenChange(false);
      
      if (onClientCreated && newClient) {
        onClientCreated(newClient);
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan klien',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah Klien Baru
          </DialogTitle>
          <DialogDescription>
            Tambahkan klien baru ke database
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Klien *</FormLabel>
                  <FormControl>
                    <Input placeholder="PT. Contoh Perusahaan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Klien</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe klien" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Swasta">Swasta</SelectItem>
                      <SelectItem value="Pemerintah">Pemerintah</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Alamat lengkap klien" 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pic_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama PIC</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama kontak" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pic_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon PIC</FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pic_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email PIC</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@contoh.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Klien
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
