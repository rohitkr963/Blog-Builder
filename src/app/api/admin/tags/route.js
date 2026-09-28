import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tag from "@/models/Tag";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

/**
 * GET /api/admin/tags
 * Admin-only: Return all tags sorted alphabetically by name.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    await connectDB();

    const tags = await Tag.find({})
      .sort({ name: 1 })
      .select("name slug createdAt updatedAt")
      .lean();

    const formattedTags = tags.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      tags: formattedTags,
    });
  } catch (error) {
    console.error("GET /api/admin/tags error:", error.message);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tags
 * Admin-only: Create a new tag.
 * Body: { name: "Next.js" }
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tag name is required" },
        { status: 400 }
      );
    }

    const trimmedName = body.name.trim();
    const slug = slugify(trimmedName);

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Invalid tag name" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check duplicate name or slug (case insensitive)
    const existingTag = await Tag.findOne({
      $or: [
        { name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { slug: slug },
      ],
    });

    if (existingTag) {
      return NextResponse.json(
        { success: false, message: "Tag name or slug already exists." },
        { status: 409 }
      );
    }

    const newTag = await Tag.create({
      name: trimmedName,
      slug: slug,
    });

    return NextResponse.json(
      {
        success: true,
        tag: {
          id: newTag._id.toString(),
          name: newTag.name,
          slug: newTag.slug,
          createdAt: newTag.createdAt,
          updatedAt: newTag.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/tags error:", error.message);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Tag name or slug already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
