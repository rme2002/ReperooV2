import Link from "next/link";
import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { HeaderMegaMenu } from "@/components/HeaderMegaMenu/HeaderMegaMenu";
import { createClient as createServerClient } from "@/utils/supabase/server";

export default async function LandingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <HeaderMegaMenu isAuthenticated={Boolean(user)} />

      <main>
        <Container size="sm" py="xl">
          <Stack gap="xl" align="center" py="6rem">
            <Stack gap={8} align="center">
              <Title order={2}>Welcome</Title>
              <Text c="dimmed" ta="center">
                Use the backoffice link above to jump into the authenticated
                dashboard experience.
              </Text>
            </Stack>
            <Button component={Link} href="/backoffice" size="md">
              Go to backoffice
            </Button>
          </Stack>
        </Container>
      </main>
    </>
  );
}
