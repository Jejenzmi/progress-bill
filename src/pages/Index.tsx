import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { PipelineOverview } from '@/components/dashboard/PipelineOverview';
import { UpcomingTerms } from '@/components/dashboard/UpcomingTerms';
import { mockProjects, mockPaymentTerms, formatCurrency } from '@/data/mockData';
import { Briefcase, Receipt, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  // Calculate stats
  const activeProjects = mockProjects.filter((p) => p.status === 'Won').length;
  const totalRevenue = mockPaymentTerms
    .filter((t) => t.invoice?.status === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingInvoices = mockPaymentTerms.filter(
    (t) => t.invoice?.status === 'Sent'
  ).length;
  const pendingAmount = mockPaymentTerms
    .filter((t) => t.invoice?.status === 'Sent')
    .reduce((sum, t) => sum + t.amount, 0);
  const lockedTermsNeedingDocs = mockPaymentTerms.filter(
    (t) => !t.isLocked && t.evidences.length === 0
  ).length;

  const activeProjectsList = mockProjects
    .filter((p) => p.status === 'Won')
    .slice(0, 3);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Selamat datang di Sales Order PT Zen Multimedia Indonesia"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Proyek Aktif"
          value={activeProjects.toString()}
          subtitle="Sedang berjalan"
          icon={<Briefcase className="h-6 w-6" />}
          variant="primary"
        />
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(totalRevenue)}
          subtitle="Tahun ini"
          icon={<TrendingUp className="h-6 w-6" />}
          variant="success"
          trend={{ value: '+12.5%', positive: true }}
        />
        <StatCard
          title="Invoice Pending"
          value={pendingInvoices.toString()}
          subtitle={formatCurrency(pendingAmount)}
          icon={<Receipt className="h-6 w-6" />}
          variant="warning"
        />
        <StatCard
          title="Butuh Dokumen"
          value={lockedTermsNeedingDocs.toString()}
          subtitle="Termin menunggu upload"
          icon={<AlertCircle className="h-6 w-6" />}
          variant="default"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Projects & Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Overview */}
          <PipelineOverview />

          {/* Active Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Proyek Aktif</h2>
              <a
                href="/projects"
                className="text-sm text-primary hover:underline"
              >
                Lihat Semua
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjectsList.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>

          {/* Recent Invoices */}
          <RecentInvoices />
        </div>

        {/* Right Column - Actions & Upcoming */}
        <div className="space-y-6">
          <UpcomingTerms />
        </div>
      </div>
    </AppLayout>
  );
}
