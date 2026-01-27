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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import zenLogo from '@/assets/zen-logo.png';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'marketing', 'finance', 'bdo', 'coo'] },
  { name: 'CEO Dashboard', href: '/ceo-dashboard', icon: Crown, roles: ['admin', 'coo'] },
  { name: 'BDO Dashboard', href: '/bdo-dashboard', icon: BriefcaseBusiness, roles: ['admin', 'bdo'] },
  { name: 'Sales Dashboard', href: '/sales-dashboard', icon: BarChart3, roles: ['admin', 'marketing', 'bdo'] },
  { name: 'Sales Report', href: '/sales-report', icon: FileBarChart, roles: ['admin', 'marketing', 'bdo', 'coo'] },
  { name: 'Dashboard PM', href: '/pm-dashboard', icon: Target, roles: ['admin', 'project_manager', 'coo'] },
  { name: 'Leads', href: '/leads', icon: UserPlus, roles: ['admin', 'marketing', 'bdo'] },
  { name: 'Pipeline', href: '/pipeline', icon: TrendingUp, roles: ['admin', 'marketing', 'bdo'] },
  { name: 'Aktivitas', href: '/activities', icon: Activity, roles: ['admin', 'marketing', 'project_manager', 'bdo'] },
  { name: 'Proyek', href: '/projects', icon: Briefcase, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] },
  { name: 'Klien', href: '/clients', icon: Users, roles: ['admin', 'marketing', 'bdo'] },
  { name: 'Quotation', href: '/quotations', icon: Calculator, roles: ['admin', 'marketing', 'bdo'] },
  { name: 'Invoice', href: '/invoices', icon: Receipt, roles: ['admin', 'finance', 'coo'] },
  { name: 'Dokumen', href: '/documents', icon: FileText, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] },
  { name: 'TTE Dokumen', href: '/signed-documents', icon: FileSignature, roles: ['admin', 'marketing', 'finance', 'coo'] },
  { name: 'Cashflow', href: '/cashflow', icon: Calendar, roles: ['admin', 'finance', 'coo'] },
];

const secondaryNavigation = [
  { name: 'Panduan', href: '/guide', icon: BookOpen, roles: ['admin', 'marketing', 'finance', 'project_manager', 'bdo', 'coo'] },
  { name: 'Kelola User', href: '/admin', icon: UserCog, roles: ['admin'] },
  { name: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin', 'coo'] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, roles, signOut, hasRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavigation = navigation.filter((item) =>
    item.roles.some((role) => hasRole(role as any))
  );

  const filteredSecondaryNavigation = secondaryNavigation.filter((item) =>
    item.roles.some((role) => hasRole(role as any))
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
            {filteredNavigation.map((item) => {
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
