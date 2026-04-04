"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Button,
  PasswordInput,
  Progress,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { createProfileFromSignupForm } from "@/app/lib/userProfile";
import { createClient } from "@/app/utils/supabase/client";

const passwordRules = [
  {
    label: "At least 8 characters",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "One uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "One lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "One number",
    test: (password: string) => /\d/.test(password),
  },
  {
    label: "One special character",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
];

export default function SignupPage() {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const setUser = useUserStore((state) => state.setUser);

  const passwordScore = passwordRules.reduce(
    (score, rule) => score + (rule.test(password) ? 1 : 0),
    0,
  );

  const passwordStrength =
    passwordScore <= 2 ? "weak" : passwordScore <= 4 ? "medium" : "strong";

  const strengthColor =
    passwordStrength === "weak"
      ? "red"
      : passwordStrength === "medium"
        ? "yellow"
        : "green";

  const strengthValue =
    passwordStrength === "weak" ? 0 : passwordStrength === "medium" ? 60 : 100;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(
      formData.get("confirmPassword") ?? "",
    ).trim();

    if (!displayName || !email || !address || !password || !confirmPassword) {
      notifications.show({
        color: "red",
        title: "One more sip",
        message: "Please fill every field so we can save your seat.",
      });
      return;
    }

    if (password !== confirmPassword) {
      notifications.show({
        color: "red",
        title: "Passwords don't match",
        message: "Let's try that again so your account brews correctly.",
      });
      return;
    }

    const submittedPasswordScore = passwordRules.reduce(
      (score, rule) => score + (rule.test(password) ? 1 : 0),
      0,
    );

    if (submittedPasswordScore <= 2) {
      notifications.show({
        color: "red",
        title: "Password too weak",
        message: "Please strengthen your password before creating an account.",
      });
      return;
    }

    if (submittedPasswordScore <= 4) {
      notifications.show({
        color: "yellow",
        title: "Medium password strength",
        message: "You can continue, but a stronger password is safer.",
      });
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          address,
        },
      },
    });

    if (error || !data.user) {
      notifications.show({
        color: "red",
        title: "Couldn't create account",
        message: error?.message ?? "Please try again in a moment.",
      });
      setIsSubmitting(false);
      return;
    }

    setUser(
      createProfileFromSignupForm({
        displayName,
        email,
        address,
      }),
    );

    notifications.show({
      color: "teal",
      title: "Account brewed",
      message: "You're all set. Your cozy corner is waiting.",
    });

    setTimeout(() => {
      router.replace("/dashboard/kiosk");
    }, 1500);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Stack gap="sm">
        <TextInput
          name="displayName"
          label="Display name"
          placeholder="How should we greet you?"
          required
          radius="md"
        />
        <TextInput
          name="email"
          type="email"
          label="Email"
          placeholder="you@cafemo.com"
          required
          radius="md"
        />
        <TextInput
          name="address"
          label="Address"
          placeholder="Your street and city"
          required
          radius="md"
        />
        <PasswordInput
          name="password"
          label="Password"
          placeholder="Create a password"
          required
          radius="md"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <Progress color={strengthColor} value={strengthValue} radius="xl" />
        <Stack gap={4}>
          {passwordRules.map((rule) => {
            const passed = rule.test(password);

            return (
              <Text key={rule.label} size="xs" c={passed ? "green" : "dimmed"}>
                {passed ? "✓" : "•"} {rule.label}
              </Text>
            );
          })}
          <Text size="xs" c={strengthColor}>
            {passwordStrength === "weak"
              ? "Weak password"
              : passwordStrength === "medium"
                ? "Medium password strength (allowed with warning)"
                : "Strong password"}
          </Text>
        </Stack>
        <PasswordInput
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
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
        Create Account
      </Button>

      <Text size="sm" c="dimmed" ta="center">
        Already have a table?{" "}
        <Anchor component={Link} href="/auth/login" fw={600}>
          Sign in
        </Anchor>
      </Text>
    </form>
  );
}
