'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  FileKey,
  BarChart3,
  Settings,
  Users,
  MapPin,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  Search,
} from 'lucide-react';

import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useUIStore, useNotificationStore } from '@/lib/stores';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  badge?: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { unreadCount } = useNotificationStore();

  const handleLogout = async () => {
    clearUser();
    await signOut({ redirect: false });
    router.push('/login');
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: '/dashboard/inspections', icon: ClipboardCheck, labelKey: 'inspections' },
    { href: '/dashboard/incidents', icon: AlertTriangle, labelKey: 'incidents' },
    { href: '/dashboard/permits', icon: FileKey, labelKey: 'permits' },
    { href: '/dashboard/reports', icon: BarChart3, labelKey: 'reports' },
    { href: '/dashboard/templates', icon: FileText, labelKey: 'templates' },
    { href: '/dashboard/sites', icon: MapPin, labelKey: 'sites' },
    { href: '/dashboard/users', icon: Users, labelKey: 'users' },
    { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-[68px]',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <Shield className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          {sidebarOpen && <span className="text-lg font-bold">OpenQHSE</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={!sidebarOpen ? t(item.labelKey as keyof IntlMessages['nav']) : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {sidebarOpen && (
                  <span className="truncate">
                    {t(item.labelKey as keyof IntlMessages['nav'])}
                  </span>
                )}
                {sidebarOpen && item.badge && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="border-t border-border p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Buscar inspecciones, incidentes..."
                className={cn(
                  'h-10 w-80 rounded-md border border-input bg-background pl-10 pr-4 text-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {user ? getInitials(`${user.first_name} ${user.last_name}`) : '??'}
              </div>
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-medium">
                  {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ') ?? ''}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t('logout')}
                title={t('logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
