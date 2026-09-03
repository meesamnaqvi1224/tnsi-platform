import { UserButton } from '@clerk/nextjs';
import { LayoutDashboard } from 'lucide-react';
import { Container, Stack, Text } from '@tnsi/ui';
import { DashboardMobileNav } from '@/components/dashboard/dashboard-sidebar';

export interface DashboardTopbarProps {
  firstName: string | null;
}

export function DashboardTopbar({ firstName }: DashboardTopbarProps) {
  return (
    <div className="border-border bg-background border-b">
      <Container size="xl" className="flex h-14 items-center justify-between gap-3">
        <Stack direction="row" align="center" gap="sm" className="min-w-0">
          <DashboardMobileNav />
          <Text size="sm" tone="muted" className="truncate tracking-[0.05em] uppercase">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </Text>
        </Stack>
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'size-8' } }}>
          <UserButton.MenuItems>
            <UserButton.Link
              label="Dashboard"
              href="/dashboard"
              labelIcon={<LayoutDashboard className="size-4" />}
            />
          </UserButton.MenuItems>
        </UserButton>
      </Container>
    </div>
  );
}
