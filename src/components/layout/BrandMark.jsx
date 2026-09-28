import Link from "next/link";

export default function BrandMark({ href = "/", compact = false, inverted = false }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-sm ${
          inverted ? "bg-white text-[var(--accent)]" : "bg-[var(--accent)] text-[var(--on-accent)]"
        }`}
      >
        B
      </span>
      {!compact && (
        <span className="truncate">
          <span className={`block text-[17px] font-semibold ${inverted ? "text-white" : "text-[var(--foreground)]"}`}>
            BlogCraft
          </span>
        </span>
      )}
    </Link>
  );
}
