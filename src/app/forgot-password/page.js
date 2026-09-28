"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not request a reset link.");
      setMessage(data.message);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <section className="mx-auto mt-12 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-10">
        <BrandMark />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Reset your password</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">Enter your account email and we will send a one-hour reset link.</p>
        {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Work email</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="ui-input min-h-12 w-full" placeholder="name@company.com" />
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary min-h-12 w-full disabled:opacity-50">{loading ? "Sending..." : "Send reset link"}</button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--accent)] hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
}