"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const { name, email, password, confirmPassword } = formData;
    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await response.json();

      if (response.status === 409) {
        throw new Error("An account with this email already exists.");
      }
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create account");
      }

      setSuccessMsg("Account created successfully. Redirecting to login...");
      setTimeout(() => router.push("/login?signup=success"), 1500);
    } catch (submitError) {
      setError(submitError.message);
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
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
              Publishing desk
            </span>
          </div>
          <div className="relative my-12 max-w-lg lg:my-0">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Ideas, in good company</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
              Knowledge grows when it is shared.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">
              BlogCraft is a home for the people building, learning, and writing about what comes next.
            </p>
          </div>
          <p className="relative text-xs text-gray-500">Analyticsliv · Editorial platform</p>
        </section>

        <section className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="absolute right-5 top-5"><ThemeToggle /></div>
          <div className="mx-auto w-full max-w-md">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Join the journal</p>
            <h2 className="ui-page-title">Create your BlogCraft account</h2>
            <p className="mt-2 text-sm text-gray-500">Set up your employee account to start publishing.</p>

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {successMsg && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
                <input id="name" name="name" type="text" autoComplete="name" required value={formData.name} onChange={handleChange} placeholder="Rohit Sharma" className="ui-input min-h-11" />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Work email</label>
                <input id="email" name="email" type="email" autoComplete="username" required value={formData.email} onChange={handleChange} placeholder="rohit@analyticsliv.com" className="ui-input min-h-11" />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="signup-password-strength" required value={formData.password} onChange={handleChange} placeholder="Create a password" className="ui-input min-h-11" />
                <PasswordStrengthMeter id="signup-password-strength" password={formData.password} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">Confirm password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={formData.confirmPassword} onChange={handleChange} placeholder="Enter your password again" className="ui-input min-h-11" />
              </div>
              <button type="submit" disabled={loading} className="ui-btn ui-btn-primary min-h-11 w-full disabled:opacity-50">
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account? <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
