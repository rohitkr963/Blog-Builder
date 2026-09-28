import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/blogs
 * Fetch all blogs across all authors for Admin management.
 * ADMIN ONLY.
 */
export async function GET() {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    await connectDB();

    // Fetch all blogs with populated author details (excluding password)
    const blogs = await Blog.find({})
      .populate("author", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    const formattedBlogs = blogs.map((blog) => ({
      id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      coverImage: blog.coverImage,
      category: blog.category,
      tags: blog.tags,
      status: blog.status,
      publishedAt: blog.publishedAt,
      views: blog.views,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
      author: blog.author
        ? {
            id: blog.author._id.toString(),
            name: blog.author.name,
            email: blog.author.email,
            role: blog.author.role,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      count: formattedBlogs.length,
      blogs: formattedBlogs,
    });
  } catch (error) {
    console.error("GET /api/admin/blogs error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin blogs." },
      { status: 500 }
    );
  }
}
