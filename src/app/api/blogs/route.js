import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { requireAuth } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { sanitizeBlogContent } from "@/lib/sanitize-blog-content";

/**
 * POST /api/blogs
 * Create a new blog post.
 * Both ADMIN and EMPLOYEE roles can create blogs.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const blogStatus = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = sanitizeBlogContent(body.content);
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    const coverImage = typeof body.coverImage === "string" ? body.coverImage.trim() : "";
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
      : [];

    if (blogStatus === "PUBLISHED" && (!title || !content.trim() || !category)) {
      return NextResponse.json(
        { success: false, message: "Title, content, and category are required to publish a blog" },
        { status: 400 }
      );
    }

    const publishedAt = blogStatus === "PUBLISHED" ? new Date() : null;

    await connectDB();

    // Generate unique slug
    const slug = await generateUniqueSlug(title || "untitled-blog");

    // Create blog with authenticated user as author
    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      coverImage,
      category,
      tags: Array.isArray(tags) ? tags.map((t) => t.toString().trim()) : [],
      status: blogStatus,
      publishedAt,
      author: user.id, // Strictly set from authenticated token, NEVER from body
    });

    // Populate author safe details for response
    await blog.populate("author", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: "Blog created successfully",
        blog,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/blogs error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to create blog" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blogs
 * Fetch blogs for authenticated user dashboard view.
 * ADMIN: Returns all blogs in system.
 * EMPLOYEE: Returns only own blogs (author == user.id).
 */
export async function GET() {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectDB();

    // Query filter based on role
    const query = user.role === "ADMIN" ? {} : { author: user.id };

    const blogs = await Blog.find(query)
      .populate("author", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: blogs.length,
      blogs,
    });
  } catch (error) {
    console.error("GET /api/blogs error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}
