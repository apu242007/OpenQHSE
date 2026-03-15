"use client";

/**
 * Client-side providers tree.
 *
 * SessionProvider must wrap QueryProvider so that react-query hooks can call
 * useSession() when they need to obtain the access token for API requests.
 *
 * When NEXT_PUBLIC_DISABLE_AUTH=true (GitHub Pages static export) SessionProvider
 * is omitted entirely because the /api/auth/* routes do not exist in Pages.
 *
 * QueryClient is created with useState() to ensure each request gets a fresh
 * instance (prevents shared state across server renders in RSC).
 */

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error) => {
              // Don't retry 401/403 — user needs to re-authenticate
              if (error instanceof Error && "status" in error) {
                const status = (error as { status: number }).status;
                if (status === 401 || status === 403) return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  const inner = (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );

  if (AUTH_DISABLED) {
    return inner;
  }

  return <SessionProvider>{inner}</SessionProvider>;
}
