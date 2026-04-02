"use client";
import { Text, Paper } from "@mantine/core";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react";
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6 py-16">
      <Paper shadow="xs" radius="xl" p="lg" className="fixed left-6 top-6 z-10">
        <Link href={"/"} className="flex items-center gap-2">
          <ArrowLeftIcon size={20} />
          <Text className="text-xs font-semibold">Go Back</Text>
        </Link>
      </Paper>
      <main className="glass-card w-full max-w-md rounded-3xl p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60">
          CafeMo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Welcome to the counter.
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground/75">
          Pull up a chair, settle in, and we&apos;ll keep your favorite sips and
          cravings close.
        </p>

        <section className="mt-8">{children}</section>
      </main>
    </div>
  );
}
