import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';

const notifications = [
  {
    title: 'Workspace shared',
    description: 'Clara invited you to “Growth experiments”.',
    status: 'New',
  },
  { title: 'Usage alert', description: 'Storage crossed 70% capacity.', status: 'Warning' },
  { title: 'Invoice ready', description: 'October billing statement is available.', status: 'Billing' },
  { title: 'New device login', description: 'Signed in from Chrome on macOS.', status: 'Security' },
];

export default function NotificationsPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Notifications</Title>
        <Text fz="sm" c="dimmed">
          Stay on top of billing, usage, and security alerts.
        </Text>
      </div>

      <Card withBorder shadow="sm" radius="md">
        <Stack gap="md">
          {notifications.map((item) => (
            <Group key={item.title} justify="space-between" align="flex-start">
              <div>
                <Text fw={500}>{item.title}</Text>
                <Text fz="sm" c="dimmed">
                  {item.description}
                </Text>
              </div>
              <Badge variant="light">{item.status}</Badge>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
