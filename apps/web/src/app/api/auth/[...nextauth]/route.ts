// This route is excluded from static export (GitHub Pages).
// It is only active in server/Docker deployments.
import { handlers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const { GET, POST } = process.env.GITHUB_PAGES === 'true'
  ? { GET: () => new Response(null, { status: 404 }), POST: () => new Response(null, { status: 404 }) }
  : handlers;

