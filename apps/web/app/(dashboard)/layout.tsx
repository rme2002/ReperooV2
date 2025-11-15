"use client";

import type { ReactNode } from "react";
import { useDisclosure } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import { ActionIcon, AppShell, Burger, Group, Title } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { NavbarSimple } from "@/components/NavbarSimple/NavbarSimple";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Title order={4}>Dashboard</Title>
          </Group>
          <ActionIcon variant="subtle" aria-label="Notifications">
            <IconBell size={18} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <NavbarSimple activePath={pathname} onNavigate={close} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
