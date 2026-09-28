import Link from "next/link";
import Image from "next/image";
import { calculateReadTime } from "@/lib/read-time";
import { optimizeCloudinaryUrl } from "@/lib/image-delivery";

export { calculateReadTime } from "@/lib/read-time";

/**
 * Reusable Blog Card Component for Public Homepage and Grid Listings.
 */
export default function BlogCard({ blog }) {
  if (!blog) return null;

  const { title, slug, excerpt, coverImage, author, category, publishedAt, createdAt, content } = blog;

  const displayDate = publishedAt || createdAt;
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const readTime = blog.readTime || calculateReadTime(content || excerpt || "");

  return (
    <article className="group ui-card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      {/* Cover Image or Fallback Visual */}
      <Link href={`/blog/${slug}`} className="relative block aspect-[16/10] overflow-hidden bg-gray-100">
        {coverImage ? (
          <Image
            src={optimizeCloudinaryUrl(coverImage, 1200)}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={coverImage.startsWith("data:")}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-800 to-stone-800 p-6 text-center text-white">
            <span className="line-clamp-2 text-xl font-semibold tracking-tight">
              {title}
            </span>
          </div>
        )}
      </Link>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="space-y-3">
          {/* Category & Read Time */}
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent)]">
              {category}
            </span>
            <span>{readTime}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-gray-900 transition group-hover:text-teal-800">
            <Link href={`/blog/${slug}`}>{title}</Link>
          </h2>

          {/* Excerpt */}
          {excerpt && (
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
              {excerpt}
            </p>
          )}
        </div>

        {/* Card Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold uppercase text-[var(--on-accent)]">
              {author?.name ? author.name.charAt(0) : "A"}
            </div>
            <span className="font-medium text-gray-700">
              {author?.name || "Analyticsliv Author"}
            </span>
          </div>

          <span>{formattedDate}</span>
        </div>
      </div>
    </article>
  );
}
