"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import Image from "next/image";
import { optimizeCloudinaryUrl } from "@/lib/image-delivery";

export default function PublicNavbar({ showBackLink = false }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const accountMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Intentionally ignore unauthenticated state.
      } finally {
        if (active) setLoading(false);
      }
    }
    checkAuth();
    window.addEventListener("profile-updated", checkAuth);
    return () => {
      active = false;
      window.removeEventListener("profile-updated", checkAuth);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !mobileMenuRef.current?.contains(event.target) &&
        !mobileMenuButtonRef.current?.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not log out.");
      setUser(null);
      setMenuOpen(false);
      setMobileMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error.message || "Could not log out. Please try again.");
    }
  };

  const dashboardHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "Admin Dashboard" : "Employee Studio";
  const profilePhoto = user?.profilePhoto;
  const profileHref = user?.role === "EMPLOYEE" ? "/employee/profile" : "/admin/dashboard";
  const writeArticleHref = user ? "/employee/blog/new" : "/login?next=/employee/blog/new";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" />

        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]">BlogCraft</Link>
          <Link href="/blogs" prefetch={false} className="text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]">Explore Blogs</Link>
          {user && <Link href={dashboardHref} prefetch={false} className="text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]">Employee Studio</Link>}
          <Link href={writeArticleHref} prefetch={false} className="text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]">Write Article</Link>
        </nav>

        <div className="flex items-center gap-3">
          {showBackLink && (
            <Link
              href="/"
              className="hidden text-sm font-medium text-gray-600 transition hover:text-gray-900 sm:inline-flex"
            >
              ← All articles
            </Link>
          )}
          <button
            type="button"
            ref={mobileMenuButtonRef}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {mobileMenuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          <ThemeToggle />

          {!loading && user ? (
            <div ref={accountMenuRef} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
              <button type="button" aria-controls="account-menu" aria-label={`Account menu for ${user.name || "user"}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((isOpen) => !isOpen)} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 shadow-sm transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-black text-[var(--on-accent)]">
                  {profilePhoto ? <Image src={optimizeCloudinaryUrl(profilePhoto, 640)} alt={user.name ? `${user.name} profile` : "Profile"} fill sizes="28px" unoptimized className="object-cover" /> : user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="hidden text-sm font-semibold text-[var(--foreground)] sm:inline">{user.name || "User"}</span>
              </button>
              {menuOpen && <div id="account-menu" role="menu" aria-label="Account options" className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-xl">
                <Link href={profileHref} role="menuitem" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">Profile</Link>
                <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]">Settings</Link>
                <button type="button" role="menuitem" onClick={handleLogout} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50">Logout</button>
                {logoutError && <p role="alert" className="border-t border-[var(--line)] px-4 py-2 text-xs text-red-700">{logoutError}</p>}
              </div>}
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--on-accent)] transition hover:brightness-95"
            >
              Sign in
            </Link>
          ) : (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          ref={mobileMenuRef}
          aria-label="Mobile navigation"
          className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-lg md:hidden"
        >
          <div className="mx-auto grid max-w-[1280px] gap-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">BlogCraft</Link>
            <Link href="/blogs" prefetch={false} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Explore Blogs</Link>
            {user && <Link href={dashboardHref} prefetch={false} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">{dashboardLabel}</Link>}
            <Link href={writeArticleHref} prefetch={false} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Write Article</Link>
            {user ? (
              <>
                <Link href={profileHref} prefetch={false} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Profile</Link>
                <Link href="/settings" prefetch={false} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Settings</Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Sign in</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">Create an account</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
