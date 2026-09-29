"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/editor/RichTextEditor";

export default function AdminEditBlogPage({ params }) {
  const router = useRouter();

  // Next.js 15+ async params unwrapping via React.use()
  const { id } = use(params);

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    category: "Data & Analytics",
    content: "",
    coverImage: "",
    status: "DRAFT",
  });

  const [authorInfo, setAuthorInfo] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([
    "Data & Analytics",
    "Careers & Tech",
    "Productivity",
    "Engineering",
    "General",
  ]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategoryOptions() {
      try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        if (res.ok && data.success && data.categories?.length > 0) {
          setCategoryOptions((current) => Array.from(new Set([...current, ...data.categories.map((category) => category.name)])));
        }
      } catch (err) {
        console.error("Failed to load admin categories:", err);
      }
    }
    loadCategoryOptions();
  }, []);

  // Fetch blog data for Admin editing
  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setFetching(true);
        setError("");

        const res = await fetch(`/api/admin/blogs/${id}`);
        const data = await res.json();

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (res.status === 403) {
          setError("Access forbidden. Admin permissions required.");
          return;
        }

        if (res.status === 404 || !res.ok || !data.success) {
          setError(data.message || "Blog not found.");
          return;
        }

        const blog = data.blog;
        setFormData({
          title: blog.title || "",
          excerpt: blog.excerpt || "",
          category: blog.category || "Data & Analytics",
          content: blog.content || "",
          coverImage: blog.coverImage || "",
          status: blog.status || "DRAFT",
        });

        setAuthorInfo(blog.author);
        setTags(Array.isArray(blog.tags) ? blog.tags : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };

    if (id) {
      fetchBlog();
    }
  }, [id, router]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size exceeds 5MB limit");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const imageFormData = new FormData();
      imageFormData.append("file", file);

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: imageFormData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image");
      }

      setFormData((prev) => ({
        ...prev,
        coverImage: data.url,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveCoverImage = () => {
    setFormData((prev) => ({
      ...prev,
      coverImage: "",
    }));
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleEditorChange = (htmlContent) => {
    setFormData((prev) => ({
      ...prev,
      content: htmlContent,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (targetStatus) => {
    setSaving(true);
    setError("");

    try {
      if (!formData.title.trim()) {
        throw new Error("Please enter a blog title");
      }
      if (!formData.content || formData.content === "<p></p>") {
        throw new Error("Please write some content for the blog");
      }
      if (!formData.category.trim()) {
        throw new Error("Please specify a category");
      }

      const payload = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        category: formData.category.trim(),
        content: formData.content,
        coverImage: formData.coverImage,
        tags: tags,
        status: targetStatus,
      };

      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update blog as Admin");
      }

      if (targetStatus === "PUBLISHED" && data.blog?.slug) {
        router.push(`/blog/${data.blog.slug}`);
      } else {
        router.push("/admin/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent mb-3"></div>
          <p className="text-sm">Loading blog data for Admin edit...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-5">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 mb-1"
            >
              ← Back to Admin Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold">
                Admin Edit Mode
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Edit Blog</h1>
          </div>

          {!error && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving || uploadingImage}
                onClick={() => handleSubmit("DRAFT")}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving || uploadingImage}
                onClick={() => handleSubmit("PUBLISHED")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
              >
                {saving ? "Updating..." : "Publish Blog"}
              </button>
            </div>
          )}
        </div>

        {error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center space-y-4">
            <p className="text-red-700 font-medium">{error}</p>
            <Link
              href="/admin/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Return to Admin Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Read-Only Author Information Card */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                  Author Information (Read-Only)
                </span>
                <span className="font-semibold text-gray-900">
                  {authorInfo?.name || "Unknown Author"}
                </span>
                <span className="text-gray-500 text-xs font-mono ml-2">
                  ({authorInfo?.email || "N/A"})
                </span>
              </div>
              <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded text-xs font-semibold">
                Role: {authorInfo?.role || "EMPLOYEE"}
              </span>
            </div>

            {/* Title Field */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Blog Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Blog title..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            {/* Cover Image Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Cover Image
              </label>

              {formData.coverImage ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2 max-w-md">
                  <img
                    src={formData.coverImage}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition"
                  >
                    Remove Cover Image
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    id="coverFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {uploadingImage && (
                    <span className="text-xs text-blue-600 font-medium animate-pulse">
                      Uploading...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Excerpt Field */}
            <div>
              <label
                htmlFor="excerpt"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Short Excerpt / Summary
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                rows={2}
                value={formData.excerpt}
                onChange={handleInputChange}
                placeholder="Brief summary..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
              />
            </div>

            {/* Category & Tag Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
                >
                  {Array.from(
                    new Set([...categoryOptions, formData.category])
                  )
                    .filter(Boolean)
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tags Input */}
              <div>
                <label
                  htmlFor="tagInput"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  Tags (press Enter to add)
                </label>
                <input
                  id="tagInput"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type tag and press Enter..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-500 hover:text-blue-900 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* TipTap Rich Text Editor */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Blog Content *
              </label>
              <RichTextEditor
                content={formData.content}
                onChange={handleEditorChange}
              />
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
