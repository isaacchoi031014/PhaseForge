"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
} from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Source Materials", href: "#", icon: FileText },
  { label: "Assessments", href: "#", icon: ClipboardList },
  { label: "Analytics", href: "#", icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href !== "#" &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
              active
                ? "active-glow bg-[#292a2b] font-semibold text-[#e3e2e3]"
                : "text-[#c4c7c8]/80 hover:bg-[#1b1c1d] hover:text-[#e3e2e3]"
            }`}
          >
            <item.icon className="size-[18px]" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
