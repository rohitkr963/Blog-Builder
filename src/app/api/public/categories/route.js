import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import Blog from "@/models/Blog";

/**
 * GET /api/public/categories
 * Fetch list of category names/slugs available on the platform.
 * Combines Admin-managed Category models with any distinct categories in Blog documents.
 */
export async function GET() {
  try {
    await connectDB();

    const dbCategories = await Category.find({})
      .sort({ name: 1 })
      .select("name slug")
      .lean();

    let categoryNames = dbCategories.map((c) => c.name);

    // Fallback: merge distinct categories from Blog collection if not present
    const blogCategories = await Blog.distinct("category");
    for (const catName of blogCategories) {
      if (catName && !categoryNames.some((c) => c.toLowerCase() === catName.toLowerCase())) {
        categoryNames.push(catName);
      }
    }

    categoryNames.sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      categories: categoryNames,
    });
  } catch (error) {
    console.error("GET /api/public/categories error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
