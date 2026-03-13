import { redirect } from 'next/navigation';

/**
 * Root page redirects to dashboard for authenticated users
 * or login for unauthenticated users.
 */
export default function RootPage() {
  redirect('/dashboard');
}
