import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

const staticRoutes = ["/", "/blogs", "/login", "/signup"];

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();
  let blogRoutes = [];

  try {
    await connectDB();
    const blogs = await Blog.find({ status: "PUBLISHED" }).select("slug updatedAt").lean();
    blogRoutes = blogs.map((blog) => ({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: blog.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (error) {
    console.warn("Sitemap blog lookup skipped:", error.message);
  }

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency: route === "/" ? "daily" : "weekly",
      priority: route === "/" ? 1 : 0.5,
    })),
    ...blogRoutes,
  ];
}