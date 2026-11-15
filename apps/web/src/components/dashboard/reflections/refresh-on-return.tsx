'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-reads the page's data when it is shown. The browser's Back and Forward buttons restore a page from the
 * router's cache, which can predate a draft or reflection the member has just written; without this the
 * history would look as if their writing were missing. It renders nothing.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  React.useEffect(() => {
    router.refresh();
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) router.refresh();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);
  return null;
}
