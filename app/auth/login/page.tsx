"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { mapSupabaseUserToProfile } from "@/app/lib/userProfile";
import { createClient } from "@/app/utils/supabase/client";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const setUser = useUserStore((state) => state.setUser);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      notifications.show({
        color: "red",
        title: "Couldnt sign in",
        message: error.message,
      });
      setIsSubmitting(false);
      return;
    }

    if (data.user) {
      setUser(mapSupabaseUserToProfile(data.user));
    }

    notifications.show({
      color: "teal",
      title: "Welcome back",
      message: "You're in. Your favorite barista is ready.",
    });

    router.replace("/dashboard/kiosk");
    setIsSubmitting(false);
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

      <Button
        type="submit"
        fullWidth
        radius="xl"
        size="md"
        loading={isSubmitting}
      >
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
