import { Button, Card, Divider, Group, Stack, Switch, Text, TextInput, Title } from '@mantine/core';

export default function SettingsPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Workspace settings</Title>
        <Text fz="sm" c="dimmed">
          Configure the basics for your organization.
        </Text>
      </div>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4}>Workspace preferences</Title>
        <Text fz="sm" c="dimmed" mt="xs">
          Update the details your teammates see across the dashboard.
        </Text>
        <TextInput label="Workspace name" placeholder="Acme Inc." defaultValue="Acme Inc." mt="lg" />
        <TextInput label="Contact email" placeholder="you@example.com" defaultValue="ops@acme.inc" mt="md" />
        <Divider my="lg" />
        <Switch label="Email me weekly summaries" defaultChecked />
        <Switch label="Require two-factor authentication" mt="md" />
        <Group mt="xl">
          <Button variant="filled">Save changes</Button>
          <Button variant="default">Reset</Button>
        </Group>
      </Card>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4}>Danger zone</Title>
        <Text fz="sm" c="dimmed" mt="xs">
          Transfer ownership or pause the workspace when you no longer need access.
        </Text>
        <Group mt="lg">
          <Button variant="default">Transfer ownership</Button>
          <Button variant="light" color="red">
            Pause workspace
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
