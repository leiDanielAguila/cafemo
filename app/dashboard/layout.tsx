import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardNav from "./DashboardNav";
import { createClient } from "@/app/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth/login");
  }

  return (
    <div className="page-shell min-h-screen">
      <header className="px-4 pt-4 md:px-8">
        <div className="glass-card mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-3 md:px-6">
          <Link href="/dashboard/kiosk" className="flex items-center gap-3">
            <Image
              src="/intel-sys-cat.png"
              alt="CafeMo logo"
              width={36}
              height={36}
              priority
              className="rounded-lg"
              style={{ height: "auto" }}
            />
            <span className="text-lg font-semibold text-[var(--color-charcoal)]">
              CafeMo
            </span>
          </Link>

          <DashboardNav />
        </div>
      </header>

      {children}
    </div>
  );
}
