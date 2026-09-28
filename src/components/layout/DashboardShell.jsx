"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SiteFooter from "@/components/layout/SiteFooter";

export default function DashboardShell({
  role = "employee",
  title,
  subtitle,
  actions,
  children,
}) {
  const router = useRouter();
  const homeHref = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ui-page">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-[var(--surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandMark href={homeHref} />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 sm:inline-flex"
            >
              Public site
            </Link>
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="ui-btn ui-btn-ghost px-3">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {(title || actions) && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {role === "admin" && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">
                  Admin workspace
                </p>
              )}
              {title && (
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
