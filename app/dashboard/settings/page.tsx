"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Divider,
  PasswordInput,
  Stack,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { createClient } from "@/app/utils/supabase/client";

export default function SettingsPage() {
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const displayName = useUserStore((state) => state.displayName);
  const resetUser = useUserStore((state) => state.resetUser);
  const updateDisplayName = useUserStore((state) => state.updateDisplayName);

  useEffect(() => {
    setDisplayNameInput(displayName);
  }, [displayName]);

  useEffect(() => {
    const syncProfile = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      const nextDisplayName =
        typeof metadata.display_name === "string"
          ? metadata.display_name.trim()
          : "";

      if (nextDisplayName) {
        setDisplayNameInput(nextDisplayName);
        updateDisplayName(nextDisplayName);
      }
    };

    void syncProfile();
  }, [supabase, updateDisplayName]);

  const handleDisplayNameSave = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedDisplayName = displayNameInput.trim();

    if (!trimmedDisplayName) {
      notifications.show({
        color: "red",
        title: "Display name required",
        message: "Please enter a display name before saving.",
      });
      return;
    }

    setIsSavingDisplayName(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: trimmedDisplayName,
      },
    });

    if (error) {
      notifications.show({
        color: "red",
        title: "Couldnt update display name",
        message: error.message,
      });
      setIsSavingDisplayName(false);
      return;
    }

    updateDisplayName(trimmedDisplayName);

    notifications.show({
      color: "teal",
      title: "Display name updated",
      message: "Your profile name has been saved.",
    });

    setIsSavingDisplayName(false);
  };

  const handlePasswordSave = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirmPassword) {
      notifications.show({
        color: "red",
        title: "Password required",
        message: "Please complete both password fields.",
      });
      return;
    }

    if (trimmedPassword.length < 8) {
      notifications.show({
        color: "red",
        title: "Password too short",
        message: "Use at least 8 characters for better security.",
      });
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      notifications.show({
        color: "red",
        title: "Passwords do not match",
        message: "Please make sure both password entries are identical.",
      });
      return;
    }

    setIsSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (error) {
      notifications.show({
        color: "red",
        title: "Couldnt update password",
        message: error.message,
      });
      setIsSavingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    notifications.show({
      color: "teal",
      title: "Password updated",
      message: "Your password has been changed successfully.",
    });

    setIsSavingPassword(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      notifications.show({
        color: "red",
        title: "Couldnt sign out",
        message: error.message,
      });
      setIsSigningOut(false);
      return;
    }

    resetUser();

    router.replace("/auth/login");
  };

  return (
    <main className="px-4 pb-8 pt-6 md:px-8">
      <section className="glass-card mx-auto w-full max-w-3xl rounded-3xl p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-[var(--color-charcoal)] md:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
          Update your profile and account security details.
        </p>

        <Stack mt="xl" gap="xl">
          <form onSubmit={handleDisplayNameSave} noValidate>
            <Stack gap="sm">
              <TextInput
                label="Display name"
                placeholder="How should we greet you?"
                value={displayNameInput}
                onChange={(event) =>
                  setDisplayNameInput(event.currentTarget.value)
                }
                required
                radius="md"
              />
              <Button
                type="submit"
                loading={isSavingDisplayName}
                radius="md"
                w="fit-content"
              >
                Save display name
              </Button>
            </Stack>
          </form>

          <Divider />

          <form onSubmit={handlePasswordSave} noValidate>
            <Stack gap="sm">
              <PasswordInput
                label="New password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
                required
                radius="md"
              />
              <PasswordInput
                label="Confirm new password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.currentTarget.value)
                }
                required
                radius="md"
              />
              <Button
                type="submit"
                loading={isSavingPassword}
                radius="md"
                w="fit-content"
              >
                Change password
              </Button>
            </Stack>
          </form>

          <Divider />

          <Button
            onClick={handleSignOut}
            variant="light"
            color="red"
            radius="md"
            w="fit-content"
            loading={isSigningOut}
          >
            Sign out
          </Button>
        </Stack>
      </section>
    </main>
  );
}
