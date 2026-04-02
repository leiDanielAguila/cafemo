"use client";

import Link from "next/link";
import {
  Anchor,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

export default function LoginPage() {
  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !password) {
      notifications.show({
        color: "red",
        title: "Almost there",
        message:
          "That pour missed the cup—please enter both email and password.",
      });
      return;
    }

    notifications.show({
      color: "teal",
      title: "Welcome back",
      message: "You're in. Your favorite barista is ready.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Stack gap="sm">
        <TextInput
          name="email"
          type="email"
          label="Email"
          placeholder="you@cafemo.com"
          required
          radius="md"
        />
        <PasswordInput
          name="password"
          label="Password"
          placeholder="Enter your password"
          required
          radius="md"
        />
      </Stack>

      <Button type="submit" fullWidth radius="xl" size="md">
        Sign In
      </Button>

      <Text size="sm" c="dimmed" ta="center">
        New around here?{" "}
        <Anchor component={Link} href="/auth/signup" fw={600}>
          Create an account
        </Anchor>
      </Text>
    </form>
  );
}
