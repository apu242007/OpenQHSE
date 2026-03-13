import { redirect } from 'next/navigation';

/**
 * Root dashboard route — redirects to the main dashboard overview.
 */
export default function DashboardRootPage() {
  redirect('/dashboard');
}
