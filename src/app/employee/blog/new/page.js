"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import RichTextEditor from "@/components/editor/RichTextEditor";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import { optimizeUploadImage } from "@/lib/optimize-upload-image";

export default function CreateBlogPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    category: "Data & Analytics",
    content: "",
    coverImage: "",
  });

  const [tags, setTags] = useState(["analytics", "business intelligence"]);
  const [tagInput, setTagInput] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([
    "Data & Analytics",
    "Careers & Tech",
    "Productivity",
    "Engineering",
    "General",
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/public/categories");
        const data = await res.json();
        if (res.ok && data.success && data.categories?.length > 0) {
          setCategoryOptions((current) => Array.from(new Set([...current, ...data.categories])));
        }
      } catch (err) {
        console.error("Failed to load category options:", err);
      }
    }
    loadCategories();
  }, []);

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

    // Validate size client-side (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size exceeds 5MB limit");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const imageFormData = new FormData();
      imageFormData.append("file", await optimizeUploadImage(file));

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
    setLoading(true);
    setError("");

    try {
      if (!formData.title.trim()) {
        throw new Error("Please enter a blog title");
      }
      if (!formData.content || formData.content === "<p></p>") {
        throw new Error("Please write some content for your blog");
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

      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create blog");
      }

      if (targetStatus === "PUBLISHED" && data.blog?.slug) {
        router.push(`/blog/${data.blog.slug}`);
      } else {
        router.push("/employee/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Blog</h1>
            <p className="text-sm text-gray-500 mt-1">
              Write and publish your post using the rich text editor
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || uploadingImage}
              onClick={() => handleSubmit("DRAFT")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={loading || uploadingImage}
              onClick={() => handleSubmit("PUBLISHED")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Publish Blog"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
              placeholder="e.g. The Future of Data Analytics"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Cover Image Upload Section */}
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
              placeholder="Brief summary to display on public blog cards..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
      </div>
      </main>
    </>
  );
}
