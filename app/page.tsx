"use client";

import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { Button } from '@mantine/core';
export default function Home() {
  const handleLearnMoreClick = () => {
    notifications.show({
      color: "Yellow",
      title: "Under Maintenance",
      message: "Barista's are currently working this out.",
    });
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
      <main className="glass-card w-full max-w-4xl rounded-3xl p-8 md:p-12">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          CafeMo
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground/75">
          The comfort of the counter, online.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get Started
          </Link>
          <Link            
            href="/dashboard/kiosk"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:bg-black/5 cursor-pointer"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <section className="rounded-2xl border border-border bg-background/40 p-4">
            <h2 className="text-sm font-semibold">Mood Sync</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Ordered for your mood, styled for your weather.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-background/40 p-4">
            <h2 className="text-sm font-semibold">Heartbeat History</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Skip the search. We already know.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-background/40 p-4">
            <h2 className="text-sm font-semibold">Cravings Translated</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Tell us what you feel, we’ll find the flavor.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
