'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Target,
  FileKey,
  ShieldAlert,
  BarChart4,
  GitBranchPlus,
  FileText,
  CheckSquare,
  GraduationCap,
  Users,
  Wrench,
  BarChart3,
  LineChart,
  Map,
  Building2,
  Settings,
  Link2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
} from 'lucide-react';

import { useAuthStore, useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { useSidebarBadges } from '@/hooks/use-analytics';

// ── Types ──────────────────────────────────────────────────

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
}

interface NavGroup {
  key: string;
  title: string;
  items: NavItem[];
}

// ── Navigation Structure ───────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'operations',
    title: 'sidebar.operations',
    items: [
      { key: 'forms', label: 'nav.forms', href: '/forms', icon: ClipboardList },
      { key: 'inspections', label: 'nav.inspections', href: '/inspections', icon: ClipboardCheck },
      { key: 'incidents', label: 'nav.incidents', href: '/incidents', icon: AlertTriangle },
      { key: 'actions', label: 'nav.actions', href: '/actions', icon: Target },
      { key: 'permits', label: 'nav.permits', href: '/permits', icon: FileKey },
    ],
  },
  {
    key: 'risks',
    title: 'sidebar.riskManagement',
    items: [
      { key: 'risk-register', label: 'nav.riskRegister', href: '/risks', icon: ShieldAlert },
      { key: 'hazop', label: 'nav.hazop', href: '/risks/hazop', icon: BarChart4 },
      { key: 'bowtie', label: 'nav.bowtie', href: '/risks/bowtie', icon: GitBranchPlus },
    ],
  },
  {
    key: 'quality',
    title: 'sidebar.qualityDocs',
    items: [
      { key: 'documents', label: 'nav.documents', href: '/documents', icon: FileText },
      { key: 'audits', label: 'nav.audits', href: '/audits', icon: CheckSquare },
    ],
  },
  {
    key: 'people',
    title: 'sidebar.people',
    items: [
      { key: 'training', label: 'nav.training', href: '/training', icon: GraduationCap },
      { key: 'users', label: 'nav.users', href: '/users', icon: Users, roles: ['super_admin', 'org_admin', 'manager'] },
    ],
  },
  {
    key: 'assets',
    title: 'sidebar.assets',
    items: [
      { key: 'equipment', label: 'nav.equipment', href: '/equipment', icon: Wrench },
    ],
  },
  {
    key: 'analytics',
    title: 'sidebar.analytics',
    items: [
      { key: 'dashboard', label: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
      { key: 'reports', label: 'nav.reports', href: '/reports', icon: BarChart3, roles: ['super_admin', 'org_admin', 'manager'] },
      { key: 'kpis', label: 'nav.kpis', href: '/kpis', icon: LineChart, roles: ['super_admin', 'org_admin', 'manager'] },
      { key: 'risk-map', label: 'nav.riskMap', href: '/risk-map', icon: Map, roles: ['super_admin', 'org_admin', 'manager', 'supervisor'] },
    ],
  },
  {
    key: 'admin',
    title: 'sidebar.admin',
    items: [
      { key: 'organization', label: 'nav.organization', href: '/organization', icon: Building2, roles: ['super_admin', 'org_admin'] },
      { key: 'settings', label: 'nav.settings', href: '/settings', icon: Settings, roles: ['super_admin', 'org_admin'] },
      { key: 'integrations', label: 'nav.integrations', href: '/integrations', icon: Link2, roles: ['super_admin', 'org_admin'] },
    ],
  },
];

// ── Badge key mapping (nav item key → SidebarBadges field) ─

const BADGE_KEY_MAP: Record<string, string> = {
  inspections: 'inspections',
  incidents: 'incidents',
  actions: 'actions',
  permits: 'permits',
  'risk-register': 'risks',
  documents: 'documents',
  audits: 'audits',
  training: 'training',
  equipment: 'equipment',
};

// ── Favorites + Recents persistence ────────────────────────

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('openqhse-favorites');
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem('openqhse-favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}

function useRecents() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('openqhse-recents');
    if (stored) setRecents(JSON.parse(stored));
  }, []);

  const addRecent = useCallback((href: string) => {
    setRecents((prev) => {
      const next = [href, ...prev.filter((h) => h !== href)].slice(0, 5);
      localStorage.setItem('openqhse-recents', JSON.stringify(next));
      return next;
    });
  }, []);

  return { recents, addRecent };
}

// ── Sidebar Component ──────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { favorites, toggleFavorite } = useFavorites();
  const { recents, addRecent } = useRecents();
  const { data: badgesData } = useSidebarBadges();

  const userRole = user?.role || 'viewer';

  // Resolve badge count for a nav item key
  const getBadge = (itemKey: string): number | undefined => {
    if (!badgesData) return undefined;
    const field = BADGE_KEY_MAP[itemKey] as keyof typeof badgesData | undefined;
    if (!field) return undefined;
    const val = badgesData[field];
    return typeof val === 'number' && val > 0 ? val : undefined;
  };

  // All items flat for favorites / recents lookup
  const allItems = NAV_GROUPS.flatMap((g) => g.items);

  // Translate helper
  const label = (key: string): string => {
    try {
      return t(key as any);
    } catch {
      return key.split('.').pop() || key;
    }
  };

  // Render a single nav item
  const renderItem = (item: NavItem, showFavStar = true) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const badgeCount = getBadge(item.key) ?? item.badge;
    const isFav = favorites.includes(item.key);
    const text = label(item.label);

    return (
      <div key={item.href} className="group relative flex items-center">
        <Link
          href={item.href}
          onClick={() => addRecent(item.href)}
          title={!sidebarOpen ? text : undefined}
          className={cn(
            'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            !sidebarOpen && 'justify-center px-2',
          )}
        >
          <Icon
            className={cn(
              'h-4.5 w-4.5 shrink-0 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            )}
            aria-hidden="true"
          />
          {sidebarOpen && (
            <>
              <span className="flex-1 truncate">{text}</span>
              {badgeCount != null && badgeCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger/15 px-1.5 text-[10px] font-bold text-danger">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </>
          )}
        </Link>
        {/* Favorite star — visible on hover when expanded */}
        {sidebarOpen && showFavStar && (
          <button
            onClick={() => toggleFavorite(item.key)}
            className={cn(
              'absolute right-1 rounded p-1 transition-opacity',
              isFav
                ? 'text-warning opacity-100'
                : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-warning',
            )}
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Star className={cn('h-3.5 w-3.5', isFav && 'fill-warning')} />
          </button>
        )}
      </div>
    );
  };

  // Favorite items
  const favoriteItems = allItems.filter(
    (item) => favorites.includes(item.key) && (!item.roles || item.roles.includes(userRole)),
  );

  // Recent items
  const recentItems = recents
    .map((href) => allItems.find((i) => i.href === href))
    .filter((i): i is NavItem => i != null && (!i.roles || i.roles.includes(userRole)))
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        {sidebarOpen && (
          <span className="text-lg font-bold tracking-tight">OpenQHSE</span>
        )}
      </div>

      {/* Scrollable navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navegación principal">
        {/* Favorites Section */}
        {sidebarOpen && favoriteItems.length > 0 && (
          <div className="mb-2 space-y-0.5">
            <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-warning/80">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {label('sidebar.favorites')}
            </p>
            {favoriteItems.map((item) => renderItem(item, false))}
          </div>
        )}

        {/* Recents Section */}
        {sidebarOpen && recentItems.length > 0 && (
          <div className="mb-2 space-y-0.5">
            <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              {label('sidebar.recents')}
            </p>
            {recentItems.map((item) => renderItem(item, false))}
          </div>
        )}

        {/* Separator if favorites or recents exist */}
        {sidebarOpen && (favoriteItems.length > 0 || recentItems.length > 0) && (
          <div className="mx-3 my-2 border-t border-border" />
        )}

        {/* Main Nav Groups */}
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(userRole),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key} className="mb-1 space-y-0.5">
              {sidebarOpen && (
                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {label(group.title)}
                </p>
              )}
              {!sidebarOpen && (
                <div className="mx-auto my-2 w-6 border-t border-border" />
              )}
              {visibleItems.map((item) => renderItem(item))}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
            'text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            !sidebarOpen && 'justify-center px-2',
          )}
          aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span>{label('sidebar.collapse')}</span>
            </>
          ) : (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
