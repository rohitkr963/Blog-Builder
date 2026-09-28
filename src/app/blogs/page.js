"use client";

import { useEffect, useState } from "react";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import BlogCard from "@/components/blog/BlogCard";
import Pagination from "@/components/blog/Pagination";

const BLOGS_PER_PAGE = 9;

export default function ExploreBlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTaxonomy() {
      try {
        const [categoryResponse, tagResponse] = await Promise.all([
          fetch("/api/public/categories"),
          fetch("/api/public/tags"),
        ]);
        const [categoryData, tagData] = await Promise.all([
          categoryResponse.json(),
          tagResponse.json(),
        ]);

        if (!isMounted) return;
        if (categoryResponse.ok && categoryData.success) setCategories(categoryData.categories || []);
        if (tagResponse.ok && tagData.success) setTags(tagData.tags || []);
      } catch (loadError) {
        console.error("Failed to load blog filters:", loadError);
      }
    }

    loadTaxonomy();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBlogs() {
      setLoading(true);
      setError("");

      const query = new URLSearchParams({ page: String(page), limit: String(BLOGS_PER_PAGE) });
      if (searchQuery) query.set("q", searchQuery);
      if (selectedCategory) query.set("category", selectedCategory);
      if (selectedTag) query.set("tag", selectedTag);

      try {
        const response = await fetch(`/api/public/blogs?${query.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load articles.");
        }

        setBlogs(data.blogs || []);
        setTotalBlogs(data.pagination?.totalBlogs || 0);
        setTotalPages(data.pagination?.totalPages || 0);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "Could not load articles.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBlogs();
    return () => controller.abort();
  }, [page, searchQuery, selectedCategory, selectedTag]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const chooseCategory = (category) => {
    setPage(1);
    setSelectedCategory(category);
  };

  const chooseTag = (tag) => {
    setPage(1);
    setSelectedTag((current) => current === tag ? "" : tag);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
  };

  const hasFilters = Boolean(searchQuery || selectedCategory || selectedTag);

  return (
    <div className="ui-page">
      <PublicNavbar />

      <main className="flex-1">
        <section className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">The public journal</p>
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="ui-page-title text-4xl sm:text-5xl">Explore Blogs</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                  Browse practical ideas, engineering notes, and stories from our contributors.
                </p>
              </div>

              <form onSubmit={submitSearch} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="blog-search">Search articles</label>
                <input
                  id="blog-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search articles, topics, or authors"
                  className="ui-input min-h-12 flex-1"
                />
                <button type="submit" className="ui-btn ui-btn-primary min-h-12 px-5">Search</button>
              </form>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section aria-label="Filter articles" className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full max-w-sm">
              <label htmlFor="category-filter" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Category</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(event) => chooseCategory(event.target.value)}
                className="ui-select min-h-11"
              >
                <option value="">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>

            <div className="flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Topics</p>
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? tags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selectedTag === tag}
                    onClick={() => chooseTag(tag)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${selectedTag === tag
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-gray-600 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    }`}
                  >
                    #{tag}
                  </button>
                )) : <p className="text-sm text-gray-500">No topics available yet.</p>}
              </div>
            </div>
          </section>

          <section aria-labelledby="results-heading" className="pt-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="results-heading" className="text-xl font-bold tracking-tight text-gray-900">Latest articles</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {loading ? "Loading articles..." : `${totalBlogs} ${totalBlogs === 1 ? "article" : "articles"}`}
                  {hasFilters ? " matching your filters" : " published"}
                </p>
              </div>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                  Clear filters
                </button>
              )}
            </div>

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
            ) : loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />)}
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {blogs.map((blog) => <BlogCard key={blog.id || blog._id || blog.slug} blog={blog} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-16 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No articles found</h3>
                <p className="mt-2 text-sm text-gray-500">Try another search or clear the selected filters.</p>
                {hasFilters && <button type="button" onClick={clearFilters} className="ui-btn ui-btn-secondary mt-5">Clear filters</button>}
              </div>
            )}

            {!error && !loading && totalPages > 1 && (
              <div className="mt-10 border-t border-[var(--line)] pt-6">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
