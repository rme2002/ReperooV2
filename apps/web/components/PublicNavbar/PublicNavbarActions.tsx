"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Group, Stack } from "@mantine/core";
import { createClient } from "@/utils/supabase/client";

type PublicNavbarActionsProps = {
  isAuthenticated: boolean;
  layout?: "inline" | "stack";
  onNavigate?: () => void;
};

export function PublicNavbarActions({
  isAuthenticated,
  layout = "inline",
  onNavigate,
}: PublicNavbarActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
    onNavigate?.();
  };

  const renderActions = (fullWidth: boolean) => {
    if (isAuthenticated) {
      return (
        <>
          <Button
            component={Link}
            href="/backoffice"
            variant="light"
            color="blue"
            fullWidth={fullWidth}
            onClick={onNavigate}
          >
            Go to backoffice
          </Button>
          <Button
            variant="default"
            onClick={handleLogout}
            loading={signingOut}
            fullWidth={fullWidth}
          >
            Logout
          </Button>
        </>
      );
    }

    return (
      <Button
        component={Link}
        href="/login"
        fullWidth={fullWidth}
        onClick={onNavigate}
      >
        Login
      </Button>
    );
  };

  if (layout === "stack") {
    return <Stack gap="xs">{renderActions(true)}</Stack>;
  }

  return <Group gap="xs">{renderActions(false)}</Group>;
}
