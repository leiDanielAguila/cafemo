"use client"
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { createClient } from "@/app/utils/supabase/client";
export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      notifications.show({
        color: "red",
        title: "Couldnt sign out",
        message: error.message,
      });
      return;
    }

    router.replace("/auth/login")
  };

  return (
    <main className="px-4 pb-8 pt-6 md:px-8">
      <section className="glass-card mx-auto w-full max-w-6xl rounded-3xl p-10 text-center">
        <h1 className="text-3xl font-semibold text-[var(--color-charcoal)]">
          404
        </h1>
        <p className="mt-3 text-sm text-[var(--color-charcoal)]/80">
          Settings is not implemented yet.
        </p>
        <Button onClick={handleSignOut} variant="light" color="red">
          Sign out
        </Button>
      </section>
    </main>
  );
}
