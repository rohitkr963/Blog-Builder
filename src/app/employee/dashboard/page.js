"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/navigation/PublicNavbar";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBlogs() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/blogs");
        const data = await res.json();

        if (!isMounted) return;

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load blogs");
        }

        setBlogs(data.blogs || []);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBlogs();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleDelete = async (blogId, blogTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${blogTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(blogId);
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete blog");
      }

      // Refresh blogs list
      setBlogs((prev) => prev.filter((b) => (b._id || b.id) !== blogId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Employee Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage, edit, draft, and publish your articles
            </p>
          </div>

          <Link
            href="/employee/blog/new"
            className="ui-btn ui-btn-primary min-h-11 px-4 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Blog
          </Link>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Blog Table / Card List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              My Blogs ({blogs.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-sm">Loading your blogs...</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                📝
              </div>
              <p className="text-base text-gray-600 font-medium">
                You haven&apos;t written any blogs yet.
              </p>
              <Link
                href="/employee/blog/new"
                className="ui-btn ui-btn-primary min-h-11 px-4 text-sm"
              >
                Write Your First Blog
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {blogs.map((blog) => {
                    const blogId = blog._id || blog.id;
                    const isDraft = blog.status === "DRAFT";

                    return (
                      <tr key={blogId} className="hover:bg-gray-50/80 transition">
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                          {blog.title}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                            {blog.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isDraft ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Published
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {new Date(blog.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          {/* Edit Button */}
                          <Link
                            href={`/employee/blog/${blogId}/edit`}
                            className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                          >
                            Edit
                          </Link>

                          {/* View Button (if Published) */}
                          {!isDraft && blog.slug && (
                            <Link
                              href={`/blog/${blog.slug}`}
                              target="_blank"
                              className="text-emerald-600 hover:text-emerald-900 font-medium text-xs"
                            >
                              View
                            </Link>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={deletingId === blogId}
                            onClick={() => handleDelete(blogId, blog.title)}
                            className="text-red-600 hover:text-red-900 font-medium text-xs disabled:opacity-50"
                          >
                            {deletingId === blogId ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </main>
    </>
  );
}
