import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import Comment from "@/models/Comment";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_COMMENT_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

async function findPublishedBlog(slug) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
  await connectDB();
  return Blog.findOne({ slug: slug.toLowerCase(), status: "PUBLISHED" }).select("_id").lean();
}

function publicComment(comment) {
  return {
    id: comment._id.toString(),
    name: comment.name,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const blog = await findPublishedBlog(slug);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    const comments = await Comment.find({ blog: blog._id, status: "APPROVED" })
      .sort({ createdAt: -1 })
      .select("name content createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      count: comments.length,
      comments: comments.map(publicComment),
    });
  } catch (error) {
    console.error("GET public blog comments error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const rate = checkRateLimit(request, "comment", 5, 10 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const { slug } = await params;
    const blog = await findPublishedBlog(slug);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!name || !email || !content) {
      return NextResponse.json({ success: false, message: "Name, email, and comment are required" }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ success: false, message: `Name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address" }, { status: 400 });
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ success: false, message: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer` }, { status: 400 });
    }

    const comment = await Comment.create({
      blog: blog._id,
      name,
      email,
      content,
      status: "PENDING",
    });

    return NextResponse.json(
      { success: true, comment: null, message: "Your comment was submitted for moderation." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST public blog comment error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to submit comment" }, { status: 500 });
  }
}