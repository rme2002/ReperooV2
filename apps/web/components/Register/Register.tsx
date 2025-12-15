"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { signUpByEmailAndPassword } from "@/lib/gen/authentication/authentication";
import classes from "./Register.module.css";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await signUpByEmailAndPassword({ email, password });

      if (response.status < 200 || response.status >= 300) {
        const message =
          (response.data as { message?: string })?.message ??
          "Unable to create account. Please try again.";
        throw new Error(message);
      }

      setSuccess(
        response.data.message ??
          "Account created. Sign in once you've confirmed your email.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create account. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={classes.page}>
      <Container size="lg" className={classes.grid}>
        <div className={classes.info}>
          <Badge size="lg" radius="xl" className={classes.badge}>
            Build with Starter
          </Badge>
          <Title className={classes.title}>Create your Starter HQ</Title>
          <Text className={classes.subtitle}>
            Centralize venue requests, automate host schedules, and keep your
            roster synced across the team.
          </Text>
        </div>

        <Paper
          withBorder
          shadow="sm"
          radius="lg"
          p="xl"
          component="form"
          onSubmit={handleSubmit}
          className={classes.card}
        >
          <Stack gap="xs" mb="lg">
            <Text size="sm" c="dimmed">
              Already have an account?{" "}
              <Anchor component={Link} href="/login">
                Sign in
              </Anchor>
            </Text>
          </Stack>

          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              mb="md"
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              icon={<IconCheck size={16} />}
              color="green"
              variant="light"
              mb="md"
            >
              {success}{" "}
              <Anchor component={Link} href="/login">
                Go to login
              </Anchor>
            </Alert>
          )}

          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="you@starter.com"
              required
              radius="md"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              type="email"
              autoComplete="email"
              disabled={loading || Boolean(success)}
            />
            <PasswordInput
              label="Password"
              placeholder="Your secure password"
              required
              radius="md"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              autoComplete="new-password"
              disabled={loading || Boolean(success)}
            />
          </Stack>

          <Button
            type="submit"
            fullWidth
            mt="xl"
            radius="md"
            loading={loading}
            disabled={loading || Boolean(success)}
          >
            Create account
          </Button>
        </Paper>
      </Container>
    </section>
  );
}
