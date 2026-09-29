import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { sanitizeBlogContent } from "@/lib/sanitize-blog-content";

/**
 * GET /api/public/blogs/[slug]
 * Public API to fetch a single published blog by slug and increment its view count.
 * Does NOT require authentication.
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { success: false, message: "Blog slug is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedSlug = slug.trim().toLowerCase();

    // Atomic query & view counter increment ($inc: { views: 1 })
    // Query condition strictly requires status: "PUBLISHED"
    const blog = await Blog.findOneAndUpdate(
      { slug: normalizedSlug, status: "PUBLISHED" },
      { $inc: { views: 1 } },
      { new: true } // Return updated document with new view count
    ).populate("author", "name");

    // If blog does not exist OR is still in DRAFT mode, return 404
    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found or is not published" },
        { status: 404 }
      );
    }

    const formattedBlog = {
      id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      content: sanitizeBlogContent(blog.content),
      excerpt: blog.excerpt,
      coverImage: blog.coverImage,
      author: blog.author ? { id: blog.author._id.toString(), name: blog.author.name } : null,
      category: blog.category,
      tags: blog.tags,
      publishedAt: blog.publishedAt,
      createdAt: blog.createdAt,
      views: blog.views,
    };

    return NextResponse.json({
      success: true,
      blog: formattedBlog,
    });
  } catch (error) {
    console.error("GET /api/public/blogs/[slug] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch public blog" },
      { status: 500 }
    );
  }
}
