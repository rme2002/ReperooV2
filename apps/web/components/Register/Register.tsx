"use client";

import Link from 'next/link';
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import classes from './Register.module.css';

export function Register() {
  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
        Create an account
      </Title>

      <Text className={classes.subtitle}>
        Already have an account?{' '}
        <Anchor component={Link} href="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <TextInput label="Email" placeholder="you@mantine.dev" required radius="md" />
        <PasswordInput
          label="Password"
          placeholder="Your secure password"
          required
          mt="md"
          radius="md"
        />
        <Button fullWidth mt="xl" radius="md">
          Create account
        </Button>
      </Paper>
    </Container>
  );
}
