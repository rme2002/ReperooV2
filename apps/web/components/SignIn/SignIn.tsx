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

export function SignIn({ action }: SignInProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
        Welcome back!
      </Title>

      <Text className={classes.subtitle}>
        Do not have an account yet?{" "}
        <Anchor component={Link} href="/register">
          Create account
        </Anchor>
      </Text>

      <Paper
        withBorder
        shadow="sm"
        p={22}
        mt={30}
        radius="md"
        component="form"
        action={formAction}
        aria-busy={pending}
      >
        {state.error ? (
          <Alert color="red" variant="light" mb="md">
            {state.error}
          </Alert>
        ) : null}
        <TextInput
          label="Email"
          name="email"
          placeholder="you@mantine.dev"
          required
          radius="md"
        />
        <PasswordInput
          label="Password"
          name="password"
          placeholder="Your password"
          required
          mt="md"
          radius="md"
        />
        <Group justify="flex-end" mt="lg">
          <Anchor component={Link} href="/forgot-password" size="sm">
            Forgot password?
          </Anchor>
        </Group>
        <SubmitButton pending={pending} />
      </Paper>
    </Container>
  );
}
