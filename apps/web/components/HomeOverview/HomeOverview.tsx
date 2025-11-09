import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';

export function HomeOverview() {
  const notifications = [
    {
      title: 'Workspace shared',
      description: 'Clara invited you to “Growth experiments”.',
      tag: '2m ago',
    },
    {
      title: 'Usage alert',
      description: 'Storage is approaching the 70% threshold.',
      tag: '15m ago',
    },
    {
      title: 'Invoice ready',
      description: 'October billing statement is available.',
      tag: '1h ago',
    },
  ];

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Card withBorder shadow="sm" radius="md">
          <Text fz="xs" c="dimmed">
            Active projects
          </Text>
          <Group justify="space-between" mt="md" align="baseline">
            <Title order={2}>12</Title>
            <Badge color="blue">+2 new</Badge>
          </Group>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Text fz="xs" c="dimmed">
            Monthly spend
          </Text>
          <Group justify="space-between" mt="md" align="baseline">
            <Title order={2}>$2,480</Title>
            <Badge color="green">-8%</Badge>
          </Group>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Text fz="xs" c="dimmed">
            Storage usage
          </Text>
          <Progress value={62} mt="md" size="lg" radius="xl" />
          <Group justify="space-between" mt="sm">
            <Text fz="sm">124 GB</Text>
            <Text fz="sm" c="dimmed">
              of 200 GB
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4}>Latest notifications</Title>
        <Stack gap="md" mt="md">
          {notifications.map((item) => (
            <Group key={item.title} justify="space-between" align="flex-start">
              <div>
                <Text fw={500}>{item.title}</Text>
                <Text fz="sm" c="dimmed">
                  {item.description}
                </Text>
              </div>
              <Badge variant="light">{item.tag}</Badge>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
