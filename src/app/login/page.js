"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
        ? nextPath
        : null;
      const isEmployeeDashboardReturn = data.user?.role === "EMPLOYEE"
        && safeNext?.split("?")[0].replace(/\/$/, "") === "/employee/dashboard";

      if (safeNext && !isEmployeeDashboardReturn) {
        router.push(safeNext);
      } else if (data.user?.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-2rem))] max-w-6xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_80px_-48px_rgba(20,24,22,0.42)] lg:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[var(--accent-soft)] px-6 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,transparent_45%,rgba(15,118,110,0.07))]" />
          <div className="relative flex items-center justify-between gap-4">
            <BrandMark />
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Publishing desk</span>
          </div>
          <div className="relative my-12 max-w-lg lg:my-0">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Ideas, in good company</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Knowledge grows when it is shared.</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">BlogCraft is a home for the people building, learning, and writing about what comes next.</p>
          </div>
          <p className="relative text-xs text-gray-500">Analyticsliv · Editorial platform</p>
        </section>

        <section className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="absolute right-5 top-5"><ThemeToggle /></div>
          <div className="mx-auto w-full max-w-md">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Welcome back</p>
            <h2 className="ui-page-title">Sign in to BlogCraft</h2>
            <p className="mt-2 text-sm text-gray-500">Use your work account to continue.</p>

            {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Work email</label>
                <input id="email" name="email" type="email" autoComplete="username" required value={formData.email} onChange={handleChange} placeholder="name@company.com" className="ui-input min-h-12" />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} aria-describedby="login-password-strength" required value={formData.password} onChange={handleChange} placeholder="Enter your password" className="ui-input min-h-12" />
                <PasswordStrengthMeter id="login-password-strength" password={formData.password} />
              </div>
              <button type="submit" disabled={loading} className="ui-btn ui-btn-primary min-h-12 w-full disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
            </form>

            <p className="mt-7 text-center text-sm text-gray-600">Need an account? <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">Create one</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
