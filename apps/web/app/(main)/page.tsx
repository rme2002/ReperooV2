import Link from "next/link";
import {
  Card,
  CardSection,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Button,
} from "@mantine/core";
import { HeaderMegaMenu } from "@/components/HeaderMegaMenu/HeaderMegaMenu";
import { createClient as createServerClient } from "@/utils/supabase/server";

const featuredStays = [
  {
    id: 1,
    title: "Cactus Ridge Casita",
    location: "Joshua Tree, California",
    price: "$210 / night",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "Canal Loft",
    location: "Amsterdam, Netherlands",
    price: "$185 / night",
    image:
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    title: "Hillside Hideout",
    location: "Kinsale, Ireland",
    price: "$230 / night",
    image:
      "https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&w=800&q=80",
  },
];

export default async function LandingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <HeaderMegaMenu isAuthenticated={Boolean(user)} />

      <main>
        <Container size="lg" py="xl">
          <Stack gap="xl" py="3rem">
            <Stack gap="sm" maw={560}>
              <Title order={1}>Find places that feel like home</Title>
              <Text c="dimmed">
                Browse hand-picked stays across cities, beaches, and mountains.
                Log in to unlock backoffice tools for managing your bookings.
              </Text>
            </Stack>

            <div>
              <Group justify="space-between" mb="md">
                <div>
                  <Text fw={600}>Featured stays</Text>
                  <Text size="sm" c="dimmed">
                    Quick snapshot of what you can expect to find.
                  </Text>
                </div>
                <Button component={Link} href="/login" variant="subtle" size="xs">
                  View more
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {featuredStays.map((stay) => (
                  <Card key={stay.id} withBorder radius="lg" padding="md">
                    <CardSection>
                      <Image
                        src={stay.image}
                        alt={stay.title}
                        height={160}
                        fallbackSrc="https://via.placeholder.com/600x400?text=Stay"
                      />
                    </CardSection>
                    <Stack gap={4} mt="md">
                      <Text fw={600}>{stay.title}</Text>
                      <Text size="sm" c="dimmed">
                        {stay.location}
                      </Text>
                      <Text fw={600} mt="sm">
                        {stay.price}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </div>
          </Stack>
        </Container>
      </main>
    </>
  );
}
