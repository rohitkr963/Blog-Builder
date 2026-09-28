import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Blog Builder",
  description: "A professional blog publishing platform by Analyticsliv",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try { var savedTheme = localStorage.getItem("blog-builder-theme"); var theme = savedTheme === "dark" ? "dark" : "light"; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch { document.documentElement.dataset.theme = "light"; }`}
        </Script>
        {children}
      </body>
    </html>
  );
}
