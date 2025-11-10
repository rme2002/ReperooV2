"use client";

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import {
  Anchor,
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import classes from './SignIn.module.css';

type SignInProps = {
  action: (formData: FormData) => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" fullWidth mt="xl" radius="md" loading={pending} disabled={pending}>
      Sign in
    </Button>
  );
}

export function SignIn({ action }: SignInProps) {
  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
        Welcome back!
      </Title>

      <Text className={classes.subtitle}>
        Do not have an account yet?{' '}
        <Anchor component={Link} href="/register">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md" component="form" action={action}>
        <TextInput label="Email" name="email" placeholder="you@mantine.dev" required radius="md" />
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
        <SubmitButton />
      </Paper>
    </Container>
  );
}
