import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import Comment from "@/models/Comment";
import Like from "@/models/Like";
import { requireAdmin } from "@/lib/auth";
import { sanitizeBlogContent } from "@/lib/sanitize-blog-content";

/**
 * Helper to validate MongoDB ObjectId format.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/admin/blogs/[id]
 * Fetch single blog by ID for Admin editing.
 * ADMIN ONLY.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format." },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id).populate("author", "name email role");

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error("GET /api/admin/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch blog." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/blogs/[id]
 * Update any blog (Admin permissions).
 * Author remains unchanged.
 * ADMIN ONLY.
 */
export async function PUT(request, { params }) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id);

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found." },
        { status: 404 }
      );
    }

    const { title, content, excerpt, coverImage, category, tags, status } = body;

    // Keep the public URL stable when the title changes.
    if (title !== undefined && title.trim() !== "") {
      const trimmedTitle = title.trim();
      if (trimmedTitle !== blog.title) blog.title = trimmedTitle;
    }

    if (content !== undefined && content.trim() !== "") {
      blog.content = sanitizeBlogContent(content);
    }

    if (category !== undefined && category.trim() !== "") {
      blog.category = category.trim();
    }

    if (excerpt !== undefined) {
      blog.excerpt = excerpt.trim();
    }

    if (coverImage !== undefined) {
      blog.coverImage = coverImage.trim();
    }

    if (Array.isArray(tags)) {
      blog.tags = tags.map((t) => t.toString().trim());
    }

    // Handle status and publication dates
    if (status !== undefined) {
      if (status === "PUBLISHED") {
        blog.status = "PUBLISHED";
        blog.publishedAt = blog.publishedAt || new Date();
      } else if (status === "DRAFT") {
        blog.status = "DRAFT";
        blog.publishedAt = null;
      }
    }

    // Note: author is strictly NOT modified (remains original creator)
    await blog.save();
    await blog.populate("author", "name email role");

    return NextResponse.json({
      success: true,
      message: "Blog updated successfully by Admin.",
      blog,
    });
  } catch (error) {
    console.error("PUT /api/admin/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to update blog." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/blogs/[id]
 * Unpublish a blog (sets status to DRAFT and publishedAt to null).
 * ADMIN ONLY.
 */
export async function PATCH(request, { params }) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format." },
        { status: 400 }
      );
    }

    await connectDB();

    const blog = await Blog.findById(id);

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found." },
        { status: 404 }
      );
    }

    // Unpublish article
    blog.status = "DRAFT";
    blog.publishedAt = null;

    await blog.save();
    await blog.populate("author", "name email role");

    return NextResponse.json({
      success: true,
      message: "Blog unpublished successfully.",
      blog,
    });
  } catch (error) {
    console.error("PATCH /api/admin/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to unpublish blog." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blogs/[id]
 * Permanently delete a blog and its public interactions.
 * ADMIN ONLY.
 */
export async function DELETE(_request, { params }) {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format." },
        { status: 400 }
      );
    }

    await connectDB();
    const deletedBlog = await Blog.findByIdAndDelete(id).select("_id").lean();
    if (!deletedBlog) {
      return NextResponse.json(
        { success: false, message: "Blog not found." },
        { status: 404 }
      );
    }

    const cleanupResults = await Promise.allSettled([
      Comment.deleteMany({ blog: deletedBlog._id }),
      Like.deleteMany({ blog: deletedBlog._id }),
    ]);
    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Blog interaction cleanup failed:", result.reason.message);
      }
    });

    return NextResponse.json({
      success: true,
      message: "Blog deleted successfully.",
      deletedBlogId: deletedBlog._id.toString(),
    });
  } catch (error) {
    console.error("DELETE /api/admin/blogs/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to delete blog." },
      { status: 500 }
    );
  }
}
