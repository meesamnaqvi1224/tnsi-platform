import type * as React from 'react';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { isReflectionsEnabled } from '@/lib/reflections-flag';

/**
 * Dedicated Academy app shell for every `/dashboard/*` page — a persistent
 * sidebar and topbar, deliberately separate from the public site's
 * SiteHeader/SiteFooter (matches the reference product: the Academy is its
 * own private workspace, not another public marketing page).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthOrRedirect();
  const reflectionsEnabled = isReflectionsEnabled();
  const firstName = user.fullName?.trim().split(/\s+/)[0] || null;

  return (
    // `overflow-clip`, not `overflow-hidden`: hidden boxes can still be scrolled
    // programmatically (Next's scroll-into-view on navigation), which dragged the
    // whole shell — sidebar included — up and left blank space below.
    <div className="flex h-screen overflow-clip">
      <DashboardSidebar reflectionsEnabled={reflectionsEnabled} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <DashboardTopbar firstName={firstName} reflectionsEnabled={reflectionsEnabled} />
        {children}
      </div>
    </div>
  );
}
