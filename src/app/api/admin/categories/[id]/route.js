import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import Blog from "@/models/Blog";
import { requireAdmin } from "@/lib/auth";

/**
 * DELETE /api/admin/categories/[id]
 * Admin-only: Delete a category if not in use by any blogs.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if any blog uses this category (case insensitive match)
    const categoryRegex = new RegExp(
      `^${category.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
    const blogUsingCategory = await Blog.exists({ category: categoryRegex });

    if (blogUsingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete category because it is being used by blogs.",
        },
        { status: 409 }
      );
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
