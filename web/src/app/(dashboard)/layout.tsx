import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, HelpCircle, LogOut, Plus, Search, Settings } from "lucide-react";

import { logout } from "@/app/(auth)/actions";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Professor";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="cosmic-bg font-body-cosmic relative flex h-screen w-full overflow-hidden text-[#e3e2e3]">
      {/* Decorative glow blobs — black-dominant with a faint navy whisper */}
      <div className="pointer-events-none fixed right-0 top-0 z-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/4 rounded-full bg-[#2e408c]/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 z-0 h-[700px] w-[700px] -translate-x-1/3 translate-y-1/3 rounded-full bg-[#2e408c]/5 blur-[150px]" />

      {/* Sidebar */}
      <aside className="relative z-50 flex w-64 flex-col border-r border-[#444748]/30 bg-[#0a0a0b] px-4 py-8">
        <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-2">
          <div className="font-display flex size-10 items-center justify-center rounded-lg border border-[#444748]/50 bg-[#1b1c1d] text-lg text-[#e3e2e3]">
            P
          </div>
          <div className="leading-tight">
            <div className="font-display text-[20px] tracking-tight">
              PhaseForge
            </div>
            <div className="font-label-cosmic text-[10px] uppercase text-[#c4c7c8]/50">
              Academic Assessment
            </div>
          </div>
        </Link>

        <Link
          href="/assessments/new"
          className="active-glow mb-10 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1b1c1d] px-4 py-3 text-sm font-semibold text-[#e3e2e3] transition hover:border-white/20 hover:bg-[#232425] active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          New Assessment
        </Link>

        <SidebarNav />

        <div className="mt-auto flex flex-col gap-1 border-t border-[#444748]/20 pt-6">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#c4c7c8]/80 transition hover:text-[#e3e2e3]"
          >
            <HelpCircle className="size-[18px]" strokeWidth={1.5} />
            Help Center
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#c4c7c8]/80 transition hover:text-[#e3e2e3]"
            >
              <LogOut className="size-[18px]" strokeWidth={1.5} />
              Log Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-[#444748]/30 bg-[#0a0a0b]/80 px-8 backdrop-blur-xl">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#c4c7c8]" />
            <input
              placeholder="Search or type a command..."
              className="font-body-cosmic w-full rounded-full border-none bg-[#1b1c1d] py-2 pl-10 pr-4 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/50 focus:ring-1 focus:ring-white/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-lg p-2 text-[#c4c7c8] transition hover:text-[#e3e2e3]">
              <Bell className="size-5" strokeWidth={1.5} />
            </button>
            <button className="rounded-lg p-2 text-[#c4c7c8] transition hover:text-[#e3e2e3]">
              <Settings className="size-5" strokeWidth={1.5} />
            </button>
            <div className="ml-2 flex items-center gap-3 border-l border-[#444748]/30 pl-4">
              <div className="flex size-8 items-center justify-center rounded-full border border-[#444748]/50 bg-[#1f2021] text-xs font-medium text-[#e3e2e3]">
                {initials}
              </div>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold">{name}</span>
                <span className="font-label-cosmic text-[10px] uppercase tracking-widest text-[#c4c7c8]/70">
                  Faculty
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
