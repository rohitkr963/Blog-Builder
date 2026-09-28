import Blog from "@/models/Blog";

/**
 * Generate a URL-friendly slug from a string.
 * Example: "10 Tips for Better Next.js Apps!" -> "10-tips-for-better-nextjs-apps"
 */
export function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-") // Replace spaces & underscores with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars except -
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

/**
 * Generate a unique slug for a Blog document.
 * If slug already exists in MongoDB, appends -2, -3, etc.
 * Option currentBlogId ignores the blog itself when updating.
 */
export async function generateUniqueSlug(title, currentBlogId = null) {
  let baseSlug = slugify(title);
  if (!baseSlug) {
    baseSlug = "untitled-blog";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentBlogId) {
      query._id = { $ne: currentBlogId };
    }

    const existingBlog = await Blog.findOne(query).select("_id").lean();
    if (!existingBlog) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}
