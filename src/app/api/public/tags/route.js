import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tag from "@/models/Tag";
import Blog from "@/models/Blog";

/**
 * GET /api/public/tags
 * Fetch list of tag names available on the platform.
 * Combines Admin-managed Tag models with any distinct tags in Blog documents.
 */
export async function GET() {
  try {
    await connectDB();

    const dbTags = await Tag.find({})
      .sort({ name: 1 })
      .select("name slug")
      .lean();

    let tagNames = dbTags.map((t) => t.name);

    // Fallback: merge distinct tags from Blog collection if not present
    const blogTags = await Blog.distinct("tags");
    for (const tagName of blogTags) {
      if (tagName && !tagNames.some((t) => t.toLowerCase() === tagName.toLowerCase())) {
        tagNames.push(tagName);
      }
    }

    tagNames.sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      tags: tagNames,
    });
  } catch (error) {
    console.error("GET /api/public/tags error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
