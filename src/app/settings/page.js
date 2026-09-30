"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function formatMemberDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/login?next=/settings");
          return;
        }

        const data = await response.json();
        if (!response.ok || !data.success || !data.user) {
          throw new Error(data.message || "Could not load account details.");
        }
        if (active) setAccount(data.user);
      } catch (error) {
        if (active) setPasswordError(error.message || "Could not load account details.");
      } finally {
        if (active) setLoadingAccount(false);
      }
    }

    loadAccount();
    return () => { active = false; };
  }, [router]);

  const updatePasswordField = (event) => {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not update password.");
      }

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordSuccess(data.message || "Password updated successfully.");
    } catch (error) {
      setPasswordError(error.message || "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Your account</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Settings</h1>
            <p className="mt-2 text-sm text-gray-600">Manage your account, sign-in security, and appearance.</p>
          </div>

          <section aria-labelledby="account-heading" className="ui-card overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <h2 id="account-heading" className="text-lg font-semibold text-gray-900">Account</h2>
              <p className="mt-1 text-sm text-gray-600">Your current BlogCraft account details.</p>
            </div>
            {loadingAccount ? (
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="h-10 animate-pulse rounded-md bg-[var(--surface-muted)]" />
                <div className="h-10 animate-pulse rounded-md bg-[var(--surface-muted)]" />
              </div>
            ) : account ? (
              <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{account.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-gray-900">{account.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account type</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{account.role === "ADMIN" ? "Administrator" : "Employee"}</dd>
                </div>
                {account.role === "EMPLOYEE" && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">{account.department || "Not set"}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member since</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{formatMemberDate(account.createdAt)}</dd>
                </div>
                {account.role === "EMPLOYEE" && (
                  <div className="sm:col-span-2">
                    <Link href="/employee/profile" className="text-sm font-semibold text-[var(--accent)] hover:underline">Edit profile details</Link>
                  </div>
                )}
              </dl>
            ) : (
              <p role="alert" className="px-5 py-5 text-sm text-red-700 sm:px-6">{passwordError || "Account details are unavailable."}</p>
            )}
          </section>

          <section aria-labelledby="security-heading" className="ui-card overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <h2 id="security-heading" className="text-lg font-semibold text-gray-900">Security</h2>
              <p className="mt-1 text-sm text-gray-600">Change your password. You will need your current password to confirm it is you.</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-5 px-5 py-5 sm:px-6">
              {passwordError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{passwordError}</p>}
              {passwordSuccess && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{passwordSuccess}</p>}
              <div>
                <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-gray-800">Current password</label>
                <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required value={passwordForm.currentPassword} onChange={updatePasswordField} className="ui-input" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-800">New password</label>
                  <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={passwordForm.newPassword} onChange={updatePasswordField} className="ui-input" />
                  <PasswordStrengthMeter id="new-password-strength" password={passwordForm.newPassword} />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-800">Confirm new password</label>
                  <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={passwordForm.confirmPassword} onChange={updatePasswordField} className="ui-input" />
                </div>
              </div>
              <button type="submit" disabled={savingPassword || loadingAccount || !account} className="ui-btn ui-btn-primary min-h-11 px-5 disabled:opacity-60">
                {savingPassword ? "Updating password..." : "Update password"}
              </button>
            </form>
          </section>

          <section aria-labelledby="appearance-heading" className="ui-card flex items-center justify-between gap-6 px-5 py-5 sm:px-6">
            <div>
              <h2 id="appearance-heading" className="text-base font-semibold text-gray-900">Appearance</h2>
              <p className="mt-1 text-sm text-gray-600">Switch between light and dark mode on this device.</p>
            </div>
            <ThemeToggle />
          </section>
        </div>
      </main>
    </>
  );
}