import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Receipt,
  Calculator,
  Calendar,
  Settings,
  TrendingUp,
  Target,
  LogOut,
  UserCog,
  FileSignature,
  BookOpen,
  BarChart3,
  UserPlus,
  Activity,
  FileBarChart,
  Crown,
  Briefcase as BriefcaseBusiness,
  LineChart,
  Award,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import zenLogo from '@/assets/zen-logo.png';

type AppRole = 'admin' | 'marketing' | 'finance' | 'project_manager' | 'bdo' | 'coo';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: AppRole[];
}

interface NavGroup {
  name: string;
  icon: any;
  roles: AppRole[];
  items: NavItem[];
}

// Grouped navigation
const navigationGroups: NavGroup[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'marketing', 'finance', 'bdo', 'coo', 'project_manager'],
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'] },
      { name: 'CEO Dashboard', href: '/ceo-dashboard', icon: Crown, roles: ['admin', 'bdo', 'coo'] },
      { name: 'BDO Dashboard', href: '/bdo-dashboard', icon: BriefcaseBusiness, roles: ['admin', 'bdo', 'coo'] },
      { name: 'Dashboard PM', href: '/pm-dashboard', icon: Target, roles: ['admin', 'project_manager', 'bdo', 'coo'] },
    ],
  },
  {
    name: 'Sales',
    icon: TrendingUp,
    roles: ['admin', 'marketing', 'bdo', 'coo'],
    items: [
      { name: 'Sales Dashboard', href: '/sales-dashboard', icon: BarChart3, roles: ['admin', 'marketing', 'bdo', 'coo'] },
      { name: 'Sales Report', href: '/sales-report', icon: FileBarChart, roles: ['admin', 'marketing', 'bdo', 'coo'] },
      { name: 'Laporan Performa', href: '/sales-performance', icon: LineChart, roles: ['admin', 'marketing', 'bdo', 'coo'] },
      { name: 'Leads', href: '/leads', icon: UserPlus, roles: ['admin', 'marketing', 'bdo', 'coo'] },
      { name: 'Pipeline', href: '/pipeline', icon: TrendingUp, roles: ['admin', 'marketing', 'bdo', 'coo'] },
    ],
  },
  {
    name: 'Operasional',
    icon: Briefcase,
    roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'],
    items: [
      { name: 'Aktivitas', href: '/activities', icon: Activity, roles: ['admin', 'marketing', 'project_manager', 'bdo', 'coo'] },
      { name: 'Proyek', href: '/projects', icon: Briefcase, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] },
      { name: 'Klien', href: '/clients', icon: Users, roles: ['admin', 'marketing', 'bdo', 'coo'] },
    ],
  },
  {
    name: 'Keuangan',
    icon: Receipt,
    roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'],
    items: [
      { name: 'Finance Dashboard', href: '/finance-dashboard', icon: BarChart3, roles: ['admin', 'finance'] },
      { name: 'Quotation', href: '/quotations', icon: Calculator, roles: ['admin', 'marketing', 'bdo', 'coo'] },
      { name: 'Kontrak SPK', href: '/contracts', icon: FileText, roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'] },
      { name: 'Riwayat Negosiasi', href: '/negotiation-history', icon: LineChart, roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'] },
      { name: 'Bonus Tim', href: '/team-bonus', icon: Award, roles: ['admin', 'finance', 'project_manager'] },
      { name: 'Invoice', href: '/invoices', icon: Receipt, roles: ['admin', 'finance', 'bdo', 'coo'] },
      { name: 'Cashflow', href: '/cashflow', icon: Calendar, roles: ['admin', 'finance', 'bdo', 'coo'] },
    ],
  },
  {
    name: 'Dokumen',
    icon: FileText,
    roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'],
    items: [
      { name: 'Dokumen', href: '/documents', icon: FileText, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] },
      { name: 'TTE Dokumen', href: '/signed-documents', icon: FileSignature, roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'] },
      { name: 'Review TTE', href: '/tte-review', icon: FileSignature, roles: ['admin', 'coo'] },
    ],
  },
];

const secondaryNavigation = [
  { name: 'Panduan', href: '/guide', icon: BookOpen, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] as AppRole[] },
  { name: 'Kelola User', href: '/admin', icon: UserCog, roles: ['admin'] as AppRole[] },
  { name: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin', 'bdo', 'coo'] as AppRole[] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, hasRole } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.href);
  };

  const filteredGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.some(role => hasRole(role))),
    }))
    .filter(group => group.items.length > 0 && group.roles.some(role => hasRole(role)));

  const filteredSecondaryNavigation = secondaryNavigation.filter((item) =>
    item.roles.some((role) => hasRole(role))
  );

  const getRoleLabel = () => {
    if (hasRole('admin')) return 'Admin';
    if (hasRole('coo')) return 'Chief Operational Officer';
    if (hasRole('bdo')) return 'Business Development Officer';
    if (hasRole('finance')) return 'Finance';
    if (hasRole('marketing')) return 'Marketing';
    if (hasRole('project_manager')) return 'Project Manager';
    return 'User';
  };

  // Auto-open group containing active route
  const activeGroup = filteredGroups.find(g => isGroupActive(g));
  if (activeGroup && !openGroups.includes(activeGroup.name)) {
    setOpenGroups(prev => [...prev, activeGroup.name]);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <img src={zenLogo} alt="PT Zen Multimedia Indonesia" className="h-8 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {filteredGroups.map((group) => {
              const isOpen = openGroups.includes(group.name);
              const isActive = isGroupActive(group);

              return (
                <Collapsible
                  key={group.name}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.name)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <group.icon className="h-5 w-5" />
                        {group.name}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-1 space-y-1">
                    {group.items.map((item) => {
                      const isItemActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                            isItemActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {filteredSecondaryNavigation.length > 0 && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              <div className="space-y-1">
                {filteredSecondaryNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-sm font-semibold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {getRoleLabel()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
