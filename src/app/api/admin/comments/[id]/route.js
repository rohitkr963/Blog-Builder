import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Comment from "@/models/Comment";

export async function PATCH(request, { params }) {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const status = body?.status;
    if (!["APPROVED", "PENDING", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid comment status." }, { status: 400 });
    }

    await connectDB();
    const comment = await Comment.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
    if (!comment) return NextResponse.json({ success: false, message: "Comment not found." }, { status: 404 });

    return NextResponse.json({ success: true, status: comment.status });
  } catch (error) {
    console.error("PATCH /api/admin/comments/[id] error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to update comment." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    await connectDB();
    const { deletedCount } = await Comment.deleteOne({ _id: (await params).id });
    if (!deletedCount) return NextResponse.json({ success: false, message: "Comment not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/comments/[id] error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to delete comment." }, { status: 500 });
  }
}