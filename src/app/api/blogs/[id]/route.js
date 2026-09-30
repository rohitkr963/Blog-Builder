import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { requireAuth } from "@/lib/auth";
import { sanitizeBlogContent } from "@/lib/sanitize-blog-content";

/**
 * Helper to validate MongoDB ObjectId string format.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Helper to check ownership authorization for a blog.
 * ADMIN: Granted access to all blogs.
 * EMPLOYEE: Granted access ONLY if blog.author matches user.id.
 */
function isAuthorizedToAccessBlog(user, blog) {
  if (user.role === "ADMIN") return true;
  const authorId = blog.author?._id
    ? blog.author._id.toString()
    : blog.author?.toString();
  return authorId === user.id;
}

/**
 * GET /api/blogs/[id]
 * Fetch a single blog by ID.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id).populate("author", "name email role");

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // Ownership Authorization Check
    if (!isAuthorizedToAccessBlog(user, blog)) {
      return NextResponse.json(
        { success: false, message: "Access forbidden. You do not own this blog." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error("GET /api/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blogs/[id]
 * Update an existing blog.
 */
export async function PUT(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id);

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // Ownership Authorization Check
    if (!isAuthorizedToAccessBlog(user, blog)) {
      return NextResponse.json(
        { success: false, message: "Access forbidden. You cannot modify another employee's blog." },
        { status: 403 }
      );
    }

    const { title, content, excerpt, coverImage, category, tags, status } = body;

    // Keep the public URL stable when the title changes.
    if (typeof title === "string") {
      const trimmedTitle = title.trim();
      if (trimmedTitle !== blog.title) blog.title = trimmedTitle;
    }

    // Update remaining editable fields
    if (typeof content === "string") {
      blog.content = sanitizeBlogContent(content);
    }

    if (typeof category === "string") {
      blog.category = category.trim();
    }

    if (typeof excerpt === "string") {
      blog.excerpt = excerpt.trim();
    }

    if (typeof coverImage === "string") {
      blog.coverImage = coverImage.trim();
    }

    if (Array.isArray(tags)) {
      blog.tags = tags.map((t) => t.toString().trim());
    }

    // Handle status & publishedAt update
    if (status !== undefined) {
      if (status === "PUBLISHED") {
        blog.status = "PUBLISHED";
        // Preserve original publication date if already published, otherwise set to now
        blog.publishedAt = blog.publishedAt || new Date();
      } else if (status === "DRAFT") {
        blog.status = "DRAFT";
        blog.publishedAt = null;
      }
    }

    if (blog.status === "PUBLISHED" && (!blog.title.trim() || !blog.content.trim() || !blog.category.trim())) {
      return NextResponse.json(
        { success: false, message: "Title, content, and category are required to publish a blog" },
        { status: 400 }
      );
    }

    // Save modifications
    await blog.save();
    await blog.populate("author", "name email role");

    return NextResponse.json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("PUT /api/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to update blog" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blogs/[id]
 * Delete a blog.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id);

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // Ownership Authorization Check
    if (!isAuthorizedToAccessBlog(user, blog)) {
      return NextResponse.json(
        { success: false, message: "Access forbidden. You cannot delete another employee's blog." },
        { status: 403 }
      );
    }

    await Blog.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
