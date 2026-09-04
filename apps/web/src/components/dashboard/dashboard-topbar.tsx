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
        <Stack direction="row" align="center" gap="md" className="shrink-0">
          <Text
            size="sm"
            tone="muted"
            className="hidden tracking-[0.05em] whitespace-nowrap uppercase lg:block"
          >
            This is your system. Use it.
          </Text>
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'size-8' } }}>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Dashboard"
                href="/dashboard"
                labelIcon={<LayoutDashboard className="size-4" />}
              />
            </UserButton.MenuItems>
          </UserButton>
        </Stack>
      </Container>
    </div>
  );
}
