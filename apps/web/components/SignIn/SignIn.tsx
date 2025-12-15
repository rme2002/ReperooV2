"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Group,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
  Badge,
} from "@mantine/core";
import type { LoginState } from "@/components/SignIn/actions";
import classes from "./SignIn.module.css";

type SignInProps = {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
};

type SubmitButtonProps = {
  pending: boolean;
};

function SubmitButton({ pending }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      radius="md"
      fullWidth
      mt="xl"
      loading={pending}
      disabled={pending}
    >
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

const INFO_POINTS = [
  "View every booking request in one place",
  "Keep host shifts and guest rosters synced",
  "Answer live chat from anywhere",
] as const;

export function SignIn({ action }: SignInProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <section className={classes.page}>
      <Container size="lg" className={classes.grid}>
        <div className={classes.info}>
          <Badge size="lg" radius="xl" className={classes.badge}>
            Welcome back
          </Badge>
          <Title className={classes.title}>Sign in to Starter</Title>
          <Text className={classes.subtitle}>
            Access your venue dashboard to manage bookings, guests, and hosts.
          </Text>
          <Stack gap="sm" mt="lg" className={classes.highlights}>
            {INFO_POINTS.map((point) => (
              <Group key={point} gap="xs" align="flex-start">
                <div className={classes.dot} />
                <Text>{point}</Text>
              </Group>
            ))}
          </Stack>
        </div>

        <Paper
          withBorder
          shadow="sm"
          radius="lg"
          p="xl"
          component="form"
          action={formAction}
          aria-busy={pending}
          className={classes.card}
        >
          {state.error ? (
            <Alert color="red" variant="light" mb="md">
              {state.error}
            </Alert>
          ) : null}

          <Stack gap="md">
            <TextInput
              label="Email"
              name="email"
              placeholder="you@starter.com"
              required
              radius="md"
            />
            <PasswordInput
              label="Password"
              name="password"
              placeholder="••••••••"
              required
              radius="md"
            />
          </Stack>

          <Group justify="space-between" mt="lg" mb="sm">
            <Anchor component={Link} href="/forgot-password" size="sm">
              Forgot password?
            </Anchor>
            <Text size="sm" c="dimmed">
              New here?{" "}
              <Anchor component={Link} href="/register">
                Create account
              </Anchor>
            </Text>
          </Group>
          <SubmitButton pending={pending} />
        </Paper>
      </Container>
    </section>
  );
}
