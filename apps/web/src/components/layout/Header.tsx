'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
  WifiOff,
  RefreshCw,
  Settings,
  MapPin,
  Search,
  Check,
  X,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

import {
  useAuthStore,
  useUIStore,
  useNotificationStore,
  useOfflineStore,
  useFiltersStore,
} from '@/lib/stores';
import { api } from '@/lib/api-client';
import { signOut } from 'next-auth/react';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

// ── Types ──────────────────────────────────────────────────

interface SiteOption {
  id: string;
  name: string;
  code: string;
}

// ── Header Component ───────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { user, clearUser } = useAuthStore();
  const { theme, setTheme, setSidebarOpen } = useUIStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { isOnline, isSyncing, queue, lastSyncAt } = useOfflineStore();
  const { selectedSiteId, setSite } = useFiltersStore();

  // ── Site Selector State ──────────────────────────────
  const [siteOpen, setSiteOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [sites, setSites] = useState<SiteOption[]>([]);
  const siteRef = useRef<HTMLDivElement>(null);

  // ── Notification Panel State ─────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Profile Dropdown State ───────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Load sites ───────────────────────────────────────
  useEffect(() => {
    api.get<{ items: SiteOption[] }>('/sites?page_size=100')
      .then((res) => setSites(res.items || []))
      .catch(() => setSites([]));
  }, []);

  // ── Close dropdowns on outside click ─────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (siteRef.current && !siteRef.current.contains(target)) setSiteOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Site filtering ───────────────────────────────────
  const filteredSites = useMemo(() => {
    if (!siteSearch) return sites;
    const q = siteSearch.toLowerCase();
    return sites.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [sites, siteSearch]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  // ── Handlers ─────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    clearUser();
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true') {
      await signOut({ redirect: false });
      router.push('/login');
    }
  }, [clearUser, router]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, setTheme]);

  const visibleNotifications = notifications.slice(0, 20);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* ── Left: Mobile menu + Breadcrumb ─── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Breadcrumb />
      </div>

      {/* ── Right: Actions ─── */}
      <div className="flex items-center gap-1.5">
        {/* Site Selector */}
        <div className="relative" ref={siteRef}>
          <button
            onClick={() => setSiteOpen(!siteOpen)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
              'hover:bg-accent',
              siteOpen && 'bg-accent',
            )}
          >
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
              {selectedSite?.name || t('common.allSites')}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', siteOpen && 'rotate-180')} />
          </button>

          {siteOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2">
              {/* Search */}
              <div className="border-b border-border p-2">
                <div className="flex items-center gap-2 rounded-md bg-accent/50 px-2.5 py-1.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                    placeholder={t('common.search') + '...'}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    autoFocus
                  />
                </div>
              </div>
              {/* All sites option */}
              <div className="max-h-64 overflow-y-auto p-1">
                <button
                  onClick={() => { setSite(null); setSiteOpen(false); setSiteSearch(''); }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    !selectedSiteId
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {!selectedSiteId && <Check className="h-4 w-4" />}
                  <span className={!selectedSiteId ? '' : 'pl-6'}>{t('common.allSites')}</span>
                </button>
                {filteredSites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => { setSite(site.id); setSiteOpen(false); setSiteSearch(''); }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      selectedSiteId === site.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {selectedSiteId === site.id && <Check className="h-4 w-4" />}
                    <span className={selectedSiteId === site.id ? '' : 'pl-6'}>
                      {site.name}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground/60">{site.code}</span>
                  </button>
                ))}
                {filteredSites.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {t('common.noResults')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sync / Offline Indicator */}
        {!isOnline ? (
          <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('common.offline')}</span>
            {queue.length > 0 && (
              <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold">
                {queue.length}
              </span>
            )}
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span className="hidden sm:inline">Sincronizando...</span>
          </div>
        ) : null}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* ── Notification Center ─── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={cn(
              'relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              notifOpen && 'bg-accent text-foreground',
            )}
            aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">{t('nav.notifications')}</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Marcar todo como leído
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                    aria-label="Cerrar notificaciones"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                {visibleNotifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <Bell className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                  </div>
                ) : (
                  visibleNotifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                        !notif.read && 'bg-primary/5',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                          !notif.read ? 'bg-primary' : 'bg-transparent',
                        )}
                      />
                      <div className="flex-1 space-y-0.5">
                        <p className={cn('text-sm', !notif.read && 'font-medium')}>{notif.title}</p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60">
                          {formatDate(notif.timestamp)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {visibleNotifications.length > 0 && (
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => { setNotifOpen(false); router.push('/notifications'); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                  >
                    Ver todas las notificaciones
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Profile Dropdown ─── */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
              'hover:bg-accent',
              profileOpen && 'bg-accent',
            )}
            {...(profileOpen && {'aria-expanded': 'true'})}
            aria-haspopup="true"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {user ? getInitials(`${user.first_name} ${user.last_name}`) : '??'}
              </div>
            )}
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium leading-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-muted-foreground transition-transform lg:block',
                profileOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); router.push('/settings/profile'); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  {t('common.profile')}
                </button>
                <button
                  onClick={() => { setProfileOpen(false); router.push('/settings'); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  {t('common.settings')}
                </button>
                <button
                  onClick={() => { setProfileOpen(false); router.push('/help'); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  {t('common.help')}
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
