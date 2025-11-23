"use client";

import { Stack, Text, Title } from "@mantine/core";
import { BusinessProfileForm } from "@/components/BusinessProfileForm/BusinessProfileForm";
import { useBusiness } from "@/components/BusinessGate/BusinessGate";

export default function SettingsPage() {
  const { business, setBusiness } = useBusiness();

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Business settings</Title>
        <Text fz="sm" c="dimmed">
          Update the information players and staff see across the platform.
        </Text>
      </div>
      <BusinessProfileForm
        mode="edit"
        business={business}
        onSuccess={(updated) => setBusiness(updated)}
      />
    </Stack>
  );
}
