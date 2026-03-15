/**
 * NextAuth v5 (stable) configuration for OpenQHSE.
 *
 * Flow:
 *   1. User submits credentials on /login
 *   2. Credentials provider POSTs to FastAPI /auth/login
 *   3. FastAPI returns { access_token, refresh_token, expires_in, user }
 *   4. jwt() callback stores tokens in the encrypted NextAuth JWT (httpOnly cookie)
 *   5. session() callback exposes safe subset to the client
 *   6. On token expiry, jwt() silently refreshes via /auth/refresh
 *
 * SECURITY:
 *   - Tokens NEVER touch localStorage — httpOnly cookie only
 *   - accessToken is exposed to server components via auth() / getServerSession()
 *   - Client components use useSession() which only sees the session shape below
 */

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type {} from "next-auth/jwt"; // required for module augmentation below

const API_BASE = process.env.API_URL ?? "http://localhost:8000/api/v1";

// ── Shape of data returned by FastAPI /auth/login ──────────
interface FastAPILoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
    organization_id: string;
    avatar_url: string | null;
    language: string;
  };
}

// ── Extend NextAuth types ───────────────────────────────────
declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: "RefreshTokenExpired";
    user: {
      id: string;
      email: string;
      name: string;
      image: string | null;
      role: string;
      organizationId: string;
      language: string;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends FastAPILoginResponse {}
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number; // unix timestamp ms
    userId: string;
    role: string;
    organizationId: string;
    language: string;
    email: string;
    name: string;
    picture: string | null;
    error?: "RefreshTokenExpired";
  }
}

// ── Refresh helper ──────────────────────────────────────────
async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;

  const data: { access_token: string; refresh_token: string; expires_in: number } =
    await res.json();
  return data;
}

// ── NextAuth v5 config ──────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        const data: FastAPILoginResponse = await res.json();
        return data;
      },
    }),
  ],

  callbacks: {
    /**
     * jwt() runs on sign-in and on every session access.
     * Stores raw tokens inside the encrypted JWT cookie — never visible to JS.
     */
    async jwt({ token, user }) {
      // First sign-in: user object from authorize()
      if (user) {
        const u = user as FastAPILoginResponse;
        return {
          ...token,
          accessToken: u.access_token,
          refreshToken: u.refresh_token,
          // expires_in is in seconds; convert to absolute ms timestamp
          accessTokenExpiresAt: Date.now() + u.expires_in * 1000,
          userId: u.user.id,
          role: u.user.role,
          organizationId: u.user.organization_id,
          language: u.user.language,
          email: u.user.email,
          name: u.user.full_name,
          picture: u.user.avatar_url ?? null,
        };
      }

      // Token still valid — return as-is
      if (Date.now() < token.accessTokenExpiresAt) {
        return token;
      }

      // Token expired — attempt silent refresh
      const refreshed = await refreshAccessToken(token.refreshToken);
      if (!refreshed) {
        return { ...token, error: "RefreshTokenExpired" } as typeof token;
      }

      return {
        ...token,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
        error: undefined,
      };
    },

    /**
     * session() shapes what useSession() / auth() returns to app code.
     * Only safe, non-sensitive data is exposed.
     */
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        error: token.error,
        user: {
          id: token.userId,
          email: token.email,
          name: token.name,
          image: token.picture,
          role: token.role,
          organizationId: token.organizationId,
          language: token.language,
        },
      };
    },
  },

  pages: {
    signIn: "/dashboard",
    error: "/dashboard",
  },

  // Use JWT strategy (default for Credentials provider)
  session: { strategy: "jwt" },

  // Trust reverse-proxy (nginx) Host headers so auth works via localhost:8080
  trustHost: true,
});
