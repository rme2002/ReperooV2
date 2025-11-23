"use client";

import { ChangeEvent, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Image,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconUpload } from "@tabler/icons-react";
import {
  createBusiness,
  updateBusiness,
  uploadBusinessAsset,
} from "@/lib/gen/businesses/businesses";
import type {
  Business,
  BusinessAssetUploadResponse,
  BusinessCreatePayload,
  BusinessResponse,
  BusinessUpdatePayload,
} from "@/lib/gen/model";

type Props = {
  mode: "create" | "edit";
  business?: Business;
  onSuccess?: (business: Business) => void;
};

type AssetField = "logoUrl" | "gcashQrUrl";

const assetTypeMap: Record<AssetField, "logo" | "payout_qr"> = {
  logoUrl: "logo",
  gcashQrUrl: "payout_qr",
};

export function BusinessProfileForm({ mode, business, onSuccess }: Props) {
  const [values, setValues] = useState(() => ({
    name: business?.name ?? "",
    description: business?.description ?? "",
    contactNumber: business?.contactNumber ?? "",
    logoUrl: business?.logoUrl ?? "",
    gcashQrUrl: business?.gcashQrUrl ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [assetLoading, setAssetLoading] = useState<{
    [K in AssetField]?: boolean;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange =
    (field: keyof typeof values) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.currentTarget.value }));
    };

  const handleUpload = async (field: AssetField, file: File | null) => {
    if (!file) {
      setValues((prev) => ({ ...prev, [field]: "" }));
      return;
    }

    setAssetLoading((prev) => ({ ...prev, [field]: true }));
    setError(null);
    try {
      const response = await uploadBusinessAsset({
        file,
        assetType: assetTypeMap[field],
      });
      if (response.status < 200 || response.status >= 300) {
        const message =
          (response.data as { message?: string })?.message ??
          "Unable to upload file. Please try again.";
        throw new Error(message);
      }
      const data = response.data as BusinessAssetUploadResponse;
      setValues((prev) => ({ ...prev, [field]: data.url }));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to upload file. Please try again.";
      setError(message);
    } finally {
      setAssetLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: BusinessCreatePayload | BusinessUpdatePayload = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        contactNumber: values.contactNumber.trim(),
        logoUrl: values.logoUrl || undefined,
        gcashQrUrl: values.gcashQrUrl || undefined,
      };

      const response =
        mode === "create"
          ? await createBusiness(payload)
          : await updateBusiness({
              businessId: business!.id,
              businessUpdatePayload: payload as BusinessUpdatePayload,
            });

      if (response.status < 200 || response.status >= 300) {
        const message =
          (response.data as { message?: string })?.message ??
          "Unable to save business profile.";
        throw new Error(message);
      }

      const data = response.data as BusinessResponse;
      setSuccess("Business profile saved.");
      onSuccess?.(data.business);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save business profile.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit =
    submitting ||
    assetLoading.logoUrl ||
    assetLoading.gcashQrUrl ||
    !values.name.trim() ||
    !values.contactNumber.trim();

  const title =
    mode === "create" ? "Business profile" : "Edit business profile";
  const buttonLabel =
    mode === "create" ? "Create business profile" : "Save changes";

  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      component="form"
      onSubmit={(event) => event.preventDefault()}
    >
      <Stack gap="md">
        <div>
          <Title order={4}>{title}</Title>
          <Text c="dimmed" fz="sm">
            Provide the details that appear across your backoffice and player
            experiences.
          </Text>
        </div>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
            {success}
          </Alert>
        )}

        <TextInput
          label="Business name"
          placeholder="Central Courts"
          required
          value={values.name}
          onChange={handleChange("name")}
          disabled={submitting}
        />
        <Textarea
          label="Description"
          placeholder="Indoor pickleball facility with 4 courts…"
          minRows={3}
          value={values.description}
          onChange={handleChange("description")}
          disabled={submitting}
        />
        <TextInput
          label="Contact number"
          placeholder="+63 900 000 0000"
          required
          value={values.contactNumber}
          onChange={handleChange("contactNumber")}
          disabled={submitting}
        />

        <Stack gap="xs">
          <Text fw={500}>Logo</Text>
          {values.logoUrl && (
            <Image
              src={values.logoUrl}
              alt="Business logo preview"
              radius="sm"
              mah={160}
              fit="contain"
              withPlaceholder
            />
          )}
          <Group gap="xs">
            <FileInput
              placeholder="Upload logo"
              leftSection={<IconUpload size={16} />}
              accept="image/png,image/jpeg,image/webp"
              onChange={(file) => void handleUpload("logoUrl", file)}
              disabled={Boolean(assetLoading.logoUrl) || submitting}
            />
            {values.logoUrl && (
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setValues((prev) => ({ ...prev, logoUrl: "" }))}
                disabled={assetLoading.logoUrl || submitting}
              >
                Remove
              </Button>
            )}
          </Group>
          {assetLoading.logoUrl && (
            <Text fz="xs" c="dimmed">
              Uploading logo…
            </Text>
          )}
        </Stack>

        <Stack gap="xs">
          <Text fw={500}>GCash QR / payout image</Text>
          {values.gcashQrUrl && (
            <Image
              src={values.gcashQrUrl}
              alt="GCash QR preview"
              radius="sm"
              mah={160}
              fit="contain"
              withPlaceholder
            />
          )}
          <Group gap="xs">
            <FileInput
              placeholder="Upload QR or payout image"
              leftSection={<IconUpload size={16} />}
              accept="image/png,image/jpeg,image/webp"
              onChange={(file) => void handleUpload("gcashQrUrl", file)}
              disabled={Boolean(assetLoading.gcashQrUrl) || submitting}
            />
            {values.gcashQrUrl && (
              <Button
                variant="subtle"
                size="xs"
                onClick={() =>
                  setValues((prev) => ({ ...prev, gcashQrUrl: "" }))
                }
                disabled={assetLoading.gcashQrUrl || submitting}
              >
                Remove
              </Button>
            )}
          </Group>
          {assetLoading.gcashQrUrl && (
            <Text fz="xs" c="dimmed">
              Uploading payout image…
            </Text>
          )}
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button
            type="submit"
            onClick={() => void handleSubmit()}
            loading={submitting}
            disabled={disableSubmit}
          >
            {buttonLabel}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
