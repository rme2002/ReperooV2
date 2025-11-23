"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Center,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { getMyBusiness } from "@/lib/gen/businesses/businesses";
import type { Business, BusinessResponse } from "@/lib/gen/model";
import { BusinessProfileForm } from "@/components/BusinessProfileForm/BusinessProfileForm";

type GateState = "loading" | "missing" | "ready" | "error";

type BusinessContextValue = {
  business: Business;
  setBusiness: (business: Business) => void;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(
  undefined,
);

type BusinessGateProps = {
  children: ReactNode;
};

export function BusinessGate({ children }: BusinessGateProps) {
  const [status, setStatus] = useState<GateState>("loading");
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextValue = useMemo(() => {
    if (!business) {
      return null;
    }

    return {
      business,
      setBusiness,
    };
  }, [business]);

  const fetchBusiness = async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await getMyBusiness();
      if (response.status === 200) {
        const data = response.data as BusinessResponse;
        setBusiness(data.business);
        setStatus("ready");
        return;
      }

      if (response.status === 404) {
        setBusiness(null);
        setStatus("missing");
        return;
      }

      if (response.status === 401) {
        setError(
          "Your session expired. Please sign in again to manage your business.",
        );
      } else if (
        response.data &&
        typeof response.data === "object" &&
        "message" in response.data
      ) {
        setError(
          (response.data as { message?: string }).message ??
            "Unable to load business information.",
        );
      } else {
        setError("Unable to load business information.");
      }
      setStatus("error");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load business information.",
      );
    }
  };

  useEffect(() => {
    void fetchBusiness();
  }, []);

  if (status === "loading") {
    return (
      <Center mih="60vh">
        <Stack align="center" gap="xs">
          <Loader />
          <Text c="dimmed" fz="sm">
            Loading business profile…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (status === "error" && error) {
    return (
      <Center mih="60vh">
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title="Unable to load business"
        >
          <Text mb="sm">{error}</Text>
          <Text
            variant="link"
            c="blue"
            component="button"
            onClick={() => fetchBusiness()}
          >
            Try again
          </Text>
        </Alert>
      </Center>
    );
  }

  if (status === "missing") {
    return (
      <Center mih="80vh">
        <Paper withBorder shadow="sm" p="xl" maw={520} w="100%">
          <Stack>
            <div>
              <Title order={3}>Set up your business</Title>
              <Text c="dimmed">
                Tell players who you are. Once saved, you can access every
                backoffice tool.
              </Text>
            </div>
            <BusinessProfileForm
              mode="create"
              onSuccess={(created) => {
                setBusiness(created);
                setStatus("ready");
              }}
            />
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (business == null) {
    return null;
  }

  if (!contextValue) {
    return null;
  }

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusiness must be used within BusinessGate");
  }
  return ctx;
}
