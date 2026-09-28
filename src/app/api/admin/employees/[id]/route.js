import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Blog from "@/models/Blog";
import { requireAdmin } from "@/lib/auth";

/**
 * DELETE /api/admin/employees/[id]
 * Remove an Employee account.
 * ADMIN ONLY.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid employee ID format." },
        { status: 400 }
      );
    }

    await connectDB();

    // 2. Find target user
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    // 3. Ensure target user is an EMPLOYEE (prevent deleting ADMIN accounts)
    if (targetUser.role !== "EMPLOYEE") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete Admin accounts through this endpoint.",
        },
        { status: 400 }
      );
    }

    // 4. Check whether employee has existing blogs
    const blogCount = await Blog.countDocuments({ author: id });

    if (blogCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete employee because they have existing blogs.",
        },
        { status: 409 }
      );
    }

    // 5. Delete employee with zero blogs
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/employees/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to delete employee." },
      { status: 500 }
    );
  }
}
