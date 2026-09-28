import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import Comment from "@/models/Comment";
import Like from "@/models/Like";

/**
 * Helper function to safely escape regex special characters.
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInteger(value, fallback) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * GET /api/public/blogs
 * Public API to fetch published blogs with search and filtering support.
 * Does NOT require authentication.
 *
 * Query parameters supported:
 * - ?q=searchterm       (Searches title, excerpt, content)
 * - ?category=category  (Filters by category name)
 * - ?tag=tag            (Filters by tag)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category")?.trim();
    const tag = searchParams.get("tag")?.trim();
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const limit = parsePositiveInteger(searchParams.get("limit"), 9);

    if (page === null || limit === null || limit > 50 || (page - 1) * limit > 2_147_483_647) {
      return NextResponse.json(
        { success: false, message: "Page must be a positive integer and limit must be between 1 and 50." },
        { status: 400 }
      );
    }

    await connectDB();

    // Base mandatory filter: strictly published blogs only
    const queryConditions = [{ status: "PUBLISHED" }];

    // Optional Search Query (title, excerpt, content)
    if (q) {
      const safeQuery = escapeRegex(q);
      const searchRegex = new RegExp(safeQuery, "i");
      queryConditions.push({
        $or: [
          { title: searchRegex },
          { excerpt: searchRegex },
          { content: searchRegex },
        ],
      });
    }

    // Optional Category Filter
    if (category) {
      const safeCategory = escapeRegex(category);
      queryConditions.push({
        category: new RegExp(`^${safeCategory}$`, "i"),
      });
    }

    // Optional Tag Filter
    if (tag) {
      const safeTag = escapeRegex(tag);
      queryConditions.push({
        tags: { $in: [new RegExp(`^${safeTag}$`, "i")] },
      });
    }

    // Combine conditions with $and
    const finalQuery =
      queryConditions.length === 1
        ? queryConditions[0]
        : { $and: queryConditions };

    const [totalBlogs, blogs, publishedBlogs, viewTotals, likeTotals, commentTotals, topArticles] = await Promise.all([
      Blog.countDocuments(finalQuery),
      Blog.find(finalQuery)
        .populate("author", "name")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "title slug excerpt coverImage author category tags publishedAt createdAt views"
        )
        .lean(),
      Blog.countDocuments({ status: "PUBLISHED" }),
      Blog.aggregate([
        { $match: { status: "PUBLISHED" } },
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]),
      Like.aggregate([
        { $lookup: { from: Blog.collection.name, localField: "blog", foreignField: "_id", as: "article" } },
        { $unwind: "$article" },
        { $match: { "article.status": "PUBLISHED" } },
        { $count: "total" },
      ]),
      Comment.aggregate([
        { $lookup: { from: Blog.collection.name, localField: "blog", foreignField: "_id", as: "article" } },
        { $unwind: "$article" },
        { $match: { "article.status": "PUBLISHED", status: "APPROVED" } },
        { $count: "total" },
      ]),
      Blog.find({ status: "PUBLISHED" })
        .sort({ views: -1, publishedAt: -1, createdAt: -1 })
        .limit(4)
        .select("title slug views")
        .lean(),
    ]);

    const blogIds = blogs.map((blog) => blog._id);
    const [articleLikes, articleComments] = blogIds.length
      ? await Promise.all([
          Like.aggregate([
            { $match: { blog: { $in: blogIds } } },
            { $group: { _id: "$blog", total: { $sum: 1 } } },
          ]),
          Comment.aggregate([
            { $match: { blog: { $in: blogIds }, status: "APPROVED" } },
            { $group: { _id: "$blog", total: { $sum: 1 } } },
          ]),
        ])
      : [[], []];
    const likesByBlog = new Map(articleLikes.map((item) => [item._id.toString(), item.total]));
    const commentsByBlog = new Map(articleComments.map((item) => [item._id.toString(), item.total]));

    // Map _id to id for clean output format
    const formattedBlogs = blogs.map((blog) => ({
      id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      coverImage: blog.coverImage,
      author: blog.author ? { id: blog.author._id.toString(), name: blog.author.name } : null,
      category: blog.category,
      tags: blog.tags,
      publishedAt: blog.publishedAt,
      createdAt: blog.createdAt,
      views: blog.views,
      likeCount: likesByBlog.get(blog._id.toString()) || 0,
      commentCount: commentsByBlog.get(blog._id.toString()) || 0,
    }));

    return NextResponse.json({
      success: true,
      count: totalBlogs,
      blogs: formattedBlogs,
      analytics: {
        publishedBlogs,
        totalViews: viewTotals[0]?.total || 0,
        totalLikes: likeTotals[0]?.total || 0,
        totalComments: commentTotals[0]?.total || 0,
        topArticles: topArticles.map((article) => ({
          title: article.title,
          slug: article.slug,
          views: article.views || 0,
        })),
      },
      pagination: {
        page,
        limit,
        totalBlogs,
        totalPages: Math.ceil(totalBlogs / limit),
        hasNextPage: page * limit < totalBlogs,
        hasPreviousPage: page > 1 && totalBlogs > 0,
      },
    });
  } catch (error) {
    console.error("GET /api/public/blogs error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch public blogs" },
      { status: 500 }
    );
  }
}
