'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/lib/stores';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { cn } from '@/lib/utils';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

/**
 * Demo layout (AUTH_DISABLED=true / GitHub Pages).
 * Never calls useSession — SessionProvider is not mounted in this mode.
 * Immediately redirects to /templates since dashboard requires auth.
 */
function DashboardLayoutDemo({ children: _children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    router.replace('/templates');
  }, [router]);
  return null;
}

/**
 * Full authenticated layout.
 * Requires SessionProvider — only used when AUTH_DISABLED=false.
 */
function DashboardLayoutFull({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { sidebarOpen } = useUIStore();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden border-r border-border bg-card transition-all duration-300 ease-in-out lg:block',
          sidebarOpen ? 'w-64' : 'w-[72px]',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <MobileDrawer />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AUTH_DISABLED ? DashboardLayoutDemo : DashboardLayoutFull;
