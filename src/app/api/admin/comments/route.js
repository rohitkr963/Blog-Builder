import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Comment from "@/models/Comment";

export async function GET(request) {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const query = status && ["APPROVED", "PENDING", "REJECTED"].includes(status) ? { status } : {};

    await connectDB();
    const comments = await Comment.find(query)
      .populate("blog", "title slug")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      comments: comments.map((comment) => ({
        id: comment._id.toString(),
        name: comment.name,
        email: comment.email,
        content: comment.content,
        status: comment.status,
        createdAt: comment.createdAt,
        blog: comment.blog ? { title: comment.blog.title, slug: comment.blog.slug } : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/comments error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to load comments." }, { status: 500 });
  }
}