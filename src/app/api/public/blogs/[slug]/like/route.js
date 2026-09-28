import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPublicReader, setPublicReaderCookie } from "@/lib/public-reader";
import Blog from "@/models/Blog";
import Like from "@/models/Like";

async function findPublishedBlog(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    return null;
  }
  await connectDB();
  return Blog.findOne({ slug: slug.toLowerCase(), status: "PUBLISHED" }).select("_id").lean();
}

function jsonWithReaderCookie(payload, reader) {
  return setPublicReaderCookie(NextResponse.json(payload), reader.readerId, reader.needsCookie);
}

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const blog = await findPublishedBlog(slug);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    const reader = await getPublicReader();
    const [likeCount, liked] = await Promise.all([
      Like.countDocuments({ blog: blog._id }),
      Like.exists({ blog: blog._id, readerId: reader.readerId }),
    ]);

    return jsonWithReaderCookie({ success: true, likeCount, likedByCurrentUser: Boolean(liked) }, reader);
  } catch (error) {
    console.error("GET public blog likes error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to load likes" }, { status: 500 });
  }
}

export async function POST(_request, { params }) {
  try {
    const { slug } = await params;
    const blog = await findPublishedBlog(slug);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    const reader = await getPublicReader();
    await Like.updateOne(
      { blog: blog._id, readerId: reader.readerId },
      { $setOnInsert: { blog: blog._id, readerId: reader.readerId } },
      { upsert: true }
    );

    const likeCount = await Like.countDocuments({ blog: blog._id });
    return jsonWithReaderCookie({ success: true, likeCount, likedByCurrentUser: true }, reader);
  } catch (error) {
    if (error.code === 11000) {
      const { slug } = await params;
      const blog = await findPublishedBlog(slug);
      if (blog) {
        const reader = await getPublicReader();
        const likeCount = await Like.countDocuments({ blog: blog._id });
        return jsonWithReaderCookie({ success: true, likeCount, likedByCurrentUser: true }, reader);
      }
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }
    console.error("POST public blog like error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to like blog" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { slug } = await params;
    const blog = await findPublishedBlog(slug);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    const reader = await getPublicReader();
    await Like.deleteOne({ blog: blog._id, readerId: reader.readerId });
    const likeCount = await Like.countDocuments({ blog: blog._id });

    return jsonWithReaderCookie({ success: true, likeCount, likedByCurrentUser: false }, reader);
  } catch (error) {
    console.error("DELETE public blog like error:", error.message);
    return NextResponse.json({ success: false, message: "Failed to remove like" }, { status: 500 });
  }
}