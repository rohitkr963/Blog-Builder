"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token] = useState(() => (
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("token") || ""
  ));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) return setError("Password must be at least 6 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not reset password.");
      setMessage(data.message);
      setTimeout(() => router.push("/login"), 1200);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <section className="mx-auto mt-12 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Choose a new password</h1>
        {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
          <input id="password" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="ui-input min-h-12 w-full" />
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm password</label>
          <input id="confirm-password" type="password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="ui-input min-h-12 w-full" />
          <button type="submit" disabled={loading || !token} className="ui-btn ui-btn-primary min-h-12 w-full disabled:opacity-50">{loading ? "Updating..." : "Update password"}</button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--accent)] hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
}