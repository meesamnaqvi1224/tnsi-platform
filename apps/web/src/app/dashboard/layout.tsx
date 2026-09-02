import type * as React from 'react';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/** Shared chrome for every `/dashboard/*` page — header, dashboard sub-nav, footer — so individual pages own only their own content. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <DashboardNav />
      {children}
      <SiteFooter />
    </>
  );
}
