import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

/**
 * GET /api/admin/categories
 * Admin-only: Return all categories sorted alphabetically by name.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) {
      return errorResponse;
    }

    await connectDB();

    const categories = await Category.find({})
      .sort({ name: 1 })
      .select("name slug createdAt updatedAt")
      .lean();

    const formattedCategories = categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("GET /api/admin/categories error:", error.message);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Admin-only: Create a new category.
 * Body: { name: "Technology" }
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
        { success: false, message: "Category name is required" },
        { status: 400 }
      );
    }

    const trimmedName = body.name.trim();
    const slug = slugify(trimmedName);

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Invalid category name" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check duplicate name or slug (case insensitive)
    const existingCategory = await Category.findOne({
      $or: [
        { name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { slug: slug },
      ],
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category name or slug already exists." },
        { status: 409 }
      );
    }

    const newCategory = await Category.create({
      name: trimmedName,
      slug: slug,
    });

    return NextResponse.json(
      {
        success: true,
        category: {
          id: newCategory._id.toString(),
          name: newCategory.name,
          slug: newCategory.slug,
          createdAt: newCategory.createdAt,
          updatedAt: newCategory.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/categories error:", error.message);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Category name or slug already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
