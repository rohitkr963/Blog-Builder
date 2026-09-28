"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Verification failed.");
        setMessage(data.message);
      })
      .catch((verificationError) => {
        setError(verificationError.message);
        setMessage("");
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <section className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Email verification</h1>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">Continue to sign in</Link>
      </section>
    </main>
  );
}