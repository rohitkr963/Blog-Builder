import PublicNavbar from "@/components/navigation/PublicNavbar";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function SettingsPage() {
  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Your account</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Choose how BlogCraft looks on this device.</p>

          <section aria-labelledby="appearance-heading" className="ui-card mt-8 flex items-center justify-between gap-6 p-6">
            <div>
              <h2 id="appearance-heading" className="text-lg font-semibold text-gray-900">Appearance</h2>
              <p className="mt-1 text-sm text-gray-600">Switch between light and dark mode. Your choice is saved in this browser.</p>
            </div>
            <ThemeToggle />
          </section>
        </div>
      </main>
    </>
  );
}