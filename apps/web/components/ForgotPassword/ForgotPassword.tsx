"use client";

import Link from "next/link";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import classes from "./ForgotPassword.module.css";

export function ForgotPassword() {
  return (
    <section className={classes.page}>
      <Container size="lg" className={classes.grid}>
        <div className={classes.info}>
          <Badge size="lg" radius="xl" className={classes.badge}>
            Reset access
          </Badge>
          <Title className={classes.title}>Forgot your password?</Title>
          <Text className={classes.subtitle}>
            Enter your email and we&apos;ll send a secure reset link so you can
            get back into Starter.
          </Text>
        </div>

        <Paper
          withBorder
          radius="lg"
          shadow="sm"
          p="xl"
          className={classes.card}
        >
          <TextInput
            label="Email"
            placeholder="you@starter.com"
            required
            radius="md"
          />

          <Stack gap="xs" mt="lg">
            <Button radius="md">Send reset link</Button>
            <Button
              variant="subtle"
              color="dark"
              component={Link}
              href="/login"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to sign in
            </Button>
          </Stack>
        </Paper>
      </Container>
    </section>
  );
}
