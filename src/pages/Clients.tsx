import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockClients, mockProjects, formatCurrency, formatShortDate } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Building2, User, Phone, Mail, MapPin, Briefcase } from 'lucide-react';
import { Client } from '@/types';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = mockClients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.picName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clientProjects = selectedClient
    ? mockProjects.filter((p) => p.clientId === selectedClient.id)
    : [];

  const clientStats = mockClients.map((client) => {
    const projects = mockProjects.filter((p) => p.clientId === client.id);
    const totalValue = projects.reduce((sum, p) => sum + p.totalValue, 0);
    return { ...client, projectCount: projects.length, totalValue };
  });

  return (
    <AppLayout title="Klien" subtitle="Database klien PT Zen Multimedia Indonesia">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari klien atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Klien
        </Button>
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Klien</p>
              <p className="text-2xl font-bold">{mockClients.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pemerintah</p>
              <p className="text-2xl font-bold">
                {mockClients.filter((c) => c.type === 'Pemerintah').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Swasta</p>
              <p className="text-2xl font-bold">
                {mockClients.filter((c) => c.type === 'Swasta').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Klien</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead className="text-right">Proyek</TableHead>
              <TableHead className="text-right">Total Nilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientStats
              .filter((client) =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.picName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedClient(client)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {client.address}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'status-badge',
                        client.type === 'Pemerintah'
                          ? 'bg-info/10 text-info'
                          : 'bg-success/10 text-success'
                      )}
                    >
                      {client.type}
                    </span>
                  </TableCell>
                  <TableCell>{client.picName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{client.picPhone}</p>
                      <p className="text-muted-foreground">{client.picEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{client.projectCount}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(client.totalValue)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedClient.name}</DialogTitle>
                <DialogDescription>
                  <span
                    className={cn(
                      'status-badge',
                      selectedClient.type === 'Pemerintah'
                        ? 'bg-info/10 text-info'
                        : 'bg-success/10 text-success'
                    )}
                  >
                    {selectedClient.type}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">PIC</p>
                      <p className="font-medium">{selectedClient.picName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telepon</p>
                      <p className="font-medium">{selectedClient.picPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedClient.picEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Alamat</p>
                      <p className="font-medium text-sm">{selectedClient.address}</p>
                    </div>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Proyek ({clientProjects.length})
                  </h3>
                  {clientProjects.length > 0 ? (
                    <div className="space-y-2">
                      {clientProjects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium">{project.projectName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatShortDate(project.startDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(project.totalValue)}
                            </p>
                            <span
                              className={cn(
                                'status-badge text-xs',
                                project.status === 'Won'
                                  ? 'status-won'
                                  : project.status === 'Completed'
                                  ? 'status-completed'
                                  : project.status === 'Pipeline'
                                  ? 'status-pipeline'
                                  : 'status-lost'
                              )}
                            >
                              {project.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Belum ada proyek
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
