import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Tag from "@/models/Tag";
import Blog from "@/models/Blog";
import { requireAdmin } from "@/lib/auth";

/**
 * DELETE /api/admin/tags/[id]
 * Admin-only: Delete a tag if not in use by any blogs.
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
        { success: false, message: "Invalid tag ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const tag = await Tag.findById(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    // Check if any blog uses this tag in its tags array (case insensitive match)
    const tagRegex = new RegExp(
      `^${tag.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
    const blogUsingTag = await Blog.exists({ tags: { $in: [tagRegex] } });

    if (blogUsingTag) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete tag because it is being used by blogs.",
        },
        { status: 409 }
      );
    }

    await Tag.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/tags/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
