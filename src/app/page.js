"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import { calculateReadTime } from "@/lib/read-time";
import { optimizeCloudinaryUrl } from "@/lib/image-delivery";

const BLOGS_PER_PAGE = 9;

function formatPublishedDate(value) {
  if (!value) return "Recently";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export default function PublicHomePage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [page, setPage] = useState(1);
  const [chartMetric, setChartMetric] = useState("views");
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: BLOGS_PER_PAGE,
    totalBlogs: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [categoriesList, setCategoriesList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [analytics, setAnalytics] = useState({
    publishedBlogs: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    topArticles: [],
    trendingTopics: [],
    topContributors: [],
  });

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
        if (categoryResponse.ok && categoryData.success) setCategoriesList(categoryData.categories || []);
        if (tagResponse.ok && tagData.success) setTagsList(tagData.tags || []);
      } catch (loadError) {
        console.error("Failed to load public taxonomy:", loadError);
      }
    }

    loadTaxonomy();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicBlogs() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedCategory) params.set("category", selectedCategory);
        if (selectedTag) params.set("tag", selectedTag);
        if (selectedAuthor) params.set("author", selectedAuthor);
        params.set("page", String(page));
        params.set("limit", String(BLOGS_PER_PAGE));

        const res = await fetch(`/api/public/blogs?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();

        if (!isMounted) return;
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to load blogs");

        const fetchedBlogs = data.blogs || [];
        setBlogs(fetchedBlogs);
        setAnalytics(data.analytics || { publishedBlogs: 0, totalViews: 0, totalLikes: 0, totalComments: 0, topArticles: [], trendingTopics: [], topContributors: [] });
        setPagination(data.pagination || { page, limit: BLOGS_PER_PAGE, totalBlogs: fetchedBlogs.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPublicBlogs();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategory, selectedTag, selectedAuthor, page]);

  const handleSearchChange = (value) => {
    setPage(1);
    setSearchQuery(value);
  };

  const handleCategoryChange = (value) => {
    setPage(1);
    setSelectedCategory(value);
  };

  const handleTagChange = (value) => {
    setPage(1);
    setSelectedTag(value);
    setSelectedAuthor("");
  };

  const handleAuthorChange = (authorId) => {
    setPage(1);
    setSelectedAuthor(authorId);
    setSelectedTag("");
  };

  const handleClearFilters = () => {
    setPage(1);
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setSelectedAuthor("");
  };

  const selectedAuthorName = analytics.topContributors.find((person) => person.id === selectedAuthor)?.name;
  const isFilterActive = searchQuery.trim() !== "" || selectedCategory !== "" || selectedTag !== "" || selectedAuthor !== "";
  const displayedBlogs = blogs;
  const featuredBlog = displayedBlogs[0] || null;
  const curatedBlogs = displayedBlogs.slice(featuredBlog ? 1 : 0, featuredBlog ? 5 : 4);
  const moreArticles = displayedBlogs.slice(featuredBlog ? 5 : 4);
  const trendingTopics = analytics.trendingTopics;
  const chartMetricOptions = [
    { key: "views", label: "Page views", color: "#397b70" },
    { key: "likeCount", label: "Likes", color: "#d17d65" },
    { key: "commentCount", label: "Comments", color: "#7782a8" },
  ];
  const currentChartMetric = chartMetricOptions.find((metric) => metric.key === chartMetric) || chartMetricOptions[0];
  const chartSourceBlogs = chartMetric === "views" && analytics.topArticles.length > 0
    ? analytics.topArticles
    : displayedBlogs;
  const chartData = [...chartSourceBlogs]
    .map((blog) => ({ blog, value: Number(blog[chartMetric]) || 0 }))
    .sort((a, b) => b.value - a.value);
  const chartAxisMaximum = Math.max(4, Math.ceil(Math.max(0, ...chartData.map(({ value }) => value)) / 4) * 4);
  const chartPoints = chartData.map(({ value }, index) => ({
    x: chartData.length === 1 ? 373 : 58 + (index * 630) / (chartData.length - 1),
    y: 20 + (1 - value / chartAxisMaximum) * 170,
    value,
  }));
  const chartLinePath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const chartAreaPath = chartPoints.length > 0
    ? `${chartLinePath} L ${chartPoints[chartPoints.length - 1].x} 190 L ${chartPoints[0].x} 190 Z`
    : "";
  const hasChartData = chartPoints.some((point) => point.value > 0);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicNavbar />

      <main className="mx-auto max-w-[1280px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-7 shadow-sm sm:px-6 sm:py-9 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              ISSUE NO. 48 · Q2 EDITORIAL DISPATCH
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              AnalyticsLiv Publishing: Insights, Ideas & <span className="text-[var(--accent)]">Engineering Stories</span>
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Deep, authoritative technical perspectives on large-scale distributed architectures, enterprise data pipelines,
              and precision frontend systems.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} className="ui-select h-12 appearance-none pl-4 pr-10 text-sm">
                  <option value="">All Disciplines</option>
                  {categoriesList.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
              </div>
              <div className="relative flex-1">
                <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search insights by topic, thesis, or author..." className="ui-input ui-search-input h-12 pr-4 text-sm" />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">⌕</span>
              </div>
              <button type="button" onClick={() => setPage(1)} className="ui-btn ui-btn-primary h-12 px-6 text-sm">Search</button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {tagsList.slice(0, 6).map((tag) => (
                <button key={tag} type="button" onClick={() => handleTagChange(tag)} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${selectedTag === tag ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)] text-gray-600 hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>
                  #{tag}
                </button>
              ))}
            </div>
            {isFilterActive && (
              <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-gray-500">
                <span>{selectedAuthor ? `Filtered by author: ${selectedAuthorName || "Contributor"}` : "Filtered results"}</span>
                <button type="button" onClick={handleClearFilters} className="font-semibold text-[var(--accent)] hover:underline">Clear filters</button>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="analytics-heading" className="mt-8">
          <div className="ui-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">The journal at a glance</p>
                <h2 id="analytics-heading" className="mt-2 text-2xl font-semibold text-gray-900">Publication analytics</h2>
                <p className="mt-1 text-sm text-gray-500">Engagement across all published articles</p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">Live totals</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Published blogs", value: analytics.publishedBlogs, icon: "▤" },
                { label: "Article views", value: analytics.totalViews, icon: "◉" },
                { label: "Likes", value: analytics.totalLikes, icon: "♥" },
                { label: "Comments", value: analytics.totalComments, icon: "◌" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-lg text-[var(--accent)]">{metric.icon}</div>
                  <div className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">{Number(metric.value || 0).toLocaleString()}</div>
                  <div className="mt-1 text-xs font-medium text-gray-500">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="ui-card p-4">
            <div className="overflow-hidden rounded-xl bg-slate-900">
              <div className="relative h-[360px] w-full overflow-hidden sm:h-[420px]">
                {featuredBlog?.coverImage ? (
                  <Image src={optimizeCloudinaryUrl(featuredBlog.coverImage, 1600)} alt={featuredBlog.title} fill sizes="(max-width: 1280px) 100vw, 1280px" unoptimized className="object-cover" priority />
                ) : <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#164e45,#274c49_60%,#6d806b)] text-2xl font-semibold text-white">Data Platform</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">{featuredBlog?.category || "AI & Data Science"}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"><span>◔</span>{featuredBlog ? (featuredBlog.readTime || calculateReadTime(featuredBlog.content || featuredBlog.excerpt || "")) : "6 min read"}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">{featuredBlog?.title || "From Investment to Impact: The Future of Enterprise Data Pipelines"}</h2>
                </div>
              </div>
            </div>

            <div className="mt-6 px-1">
              <p className="text-base leading-relaxed text-gray-700 sm:text-lg">{featuredBlog?.excerpt || "Modern distributed enterprises have amassed petabytes of raw behavioral telemetry, yet executive decision latency remains stubbornly high. Here is our architectural blueprint for stream-first consolidation, zero-copy warehouse abstraction, and automated lineage auditing."}</p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--on-accent)]">{featuredBlog?.author?.name?.charAt(0)?.toUpperCase() || "R"}</div>
                  <div><div className="text-sm font-semibold text-gray-900">{featuredBlog?.author?.name || "Rohit Kumar"}</div><div className="text-xs uppercase tracking-wide text-gray-500">{formatPublishedDate(featuredBlog?.publishedAt || featuredBlog?.createdAt)} · Principal Architect</div></div>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5">♥ {featuredBlog?.likeCount ?? 0}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5">💬 {featuredBlog?.commentCount ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="ui-card p-5">
              <h3 className="text-xl font-semibold text-gray-900">Trending Topics</h3>
              <div className="mt-5 space-y-3">
                {trendingTopics.length > 0 ? trendingTopics.map((topic, idx) => (
                  <button key={topic.name} type="button" onClick={() => handleTagChange(topic.name)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${selectedTag === topic.name ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"}`}>
                    <span className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[10px] font-medium text-gray-700">{idx + 1}</span><span className="text-sm font-medium text-gray-700">{topic.name}</span></span><span className="text-gray-400">›</span>
                  </button>
                )) : <div className="text-sm text-gray-500">No tags available yet.</div>}
              </div>
            </div>

            <div className="ui-card p-5">
              <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-semibold text-gray-900">Top Contributors</h3><button type="button" onClick={() => setSelectedAuthor("")} className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">View all</button></div>
              <div className="space-y-3">
                {analytics.topContributors.length > 0 ? analytics.topContributors.map((person) => (
                  <button key={person.id} type="button" onClick={() => handleAuthorChange(person.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${selectedAuthor === person.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">{person.name?.trim().charAt(0)?.toUpperCase() || "?"}</span><span><span className="block text-sm font-semibold text-gray-900">{person.name}</span><span className="block text-[11px] uppercase tracking-wide text-gray-500">{person.publishedCount} published {person.publishedCount === 1 ? "article" : "articles"}</span></span>
                  </button>
                )) : <p className="text-sm text-gray-500">No published contributors yet.</p>}
              </div>
            </div>
          </aside>
        </section>

        <section id="blogs" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-2xl font-semibold text-gray-900">Curated Dispatches</h3><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Newest articles</div></div>
            <Link href="/blogs" className="ui-btn ui-btn-secondary px-4 py-2 text-sm">View all blogs <span aria-hidden="true">→</span></Link>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />)}</div>
          ) : displayedBlogs.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {curatedBlogs.map((blog, idx) => (
                <article key={blog.id || blog._id || idx} className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Link href={`/blog/${blog.slug}`} className="block" aria-label={`Read ${blog.title}`}>
                    <div className="relative mb-4 h-44 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                      {blog.coverImage ? <Image src={optimizeCloudinaryUrl(blog.coverImage, 1200)} alt={blog.title} fill sizes="(max-width: 1024px) 100vw, 50vw" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center bg-[var(--accent-soft)] text-lg font-medium text-[var(--accent)]">{blog.title?.slice(0, 2).toUpperCase() || "AI"}</div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>{blog.category || "Engineering"}</span><span>{blog.readTime || calculateReadTime(blog.excerpt || "")}</span></div>
                    <h4 className="mt-3 text-xl font-semibold leading-snug text-gray-900 transition group-hover:text-[var(--accent)]">{blog.title}</h4>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">{blog.excerpt || "A practical perspective for teams shipping resilient systems and better product outcomes."}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                      <span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-[var(--on-accent)]">{blog.author?.name?.charAt(0)?.toUpperCase() || "A"}</span><span><span className="block text-sm font-semibold text-gray-900">{blog.author?.name || "Analyticsliv Author"}</span><span className="block text-[10px] uppercase tracking-wide text-gray-500">{formatPublishedDate(blog.publishedAt || blog.createdAt)}</span></span></span>
                      <span className="flex items-center gap-2 text-sm text-gray-500">♥ {blog.likeCount ?? 0} <span>💬 {blog.commentCount ?? 0}</span></span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-center text-gray-600">No articles found for this filter.</div>}
        </section>

        {false && !loading && moreArticles.length > 0 && (
          <section aria-labelledby="more-articles-heading" className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Keep exploring</p>
                <h2 id="more-articles-heading" className="mt-1 text-xl font-semibold text-gray-900">More from the journal</h2>
              </div>
              <span className="text-xs text-gray-500">{moreArticles.length} more {moreArticles.length === 1 ? "article" : "articles"} in this issue</span>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {moreArticles.map((blog, index) => (
                <Link key={blog.id || blog._id} href={`/blog/${blog.slug}`} className="group flex min-w-0 items-center gap-4 border-t border-[var(--line)] py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">{index + 5}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-[var(--accent)]">{blog.title}</span>
                    <span className="mt-1 block truncate text-[10px] uppercase tracking-wide text-gray-500">{blog.category || "Engineering"} · {blog.author?.name || "Analyticsliv Author"} · {formatPublishedDate(blog.publishedAt || blog.createdAt)}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-sm text-[var(--accent)]">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && (
          <section aria-labelledby="discover-heading" className="mt-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Find your next read</p>
                <h2 id="discover-heading" className="mt-2 text-2xl font-semibold text-gray-900">Explore the blog by topic</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">Browse articles by category or tag and discover more ideas from the blog.</p>
              </div>
              <Link href="/blogs" className="ui-btn ui-btn-secondary w-fit px-4 py-2 text-sm">Browse all articles <span aria-hidden="true">→</span></Link>
            </div>
            <div className="mt-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Topics to explore</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoriesList.length > 0 ? categoriesList.map((category) => (
                    <button key={category} type="button" onClick={() => { handleCategoryChange(category); setSelectedTag(""); setSelectedAuthor(""); }} className={`rounded-full border px-4 py-2 text-sm transition ${selectedCategory === category ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]" : "border-[var(--line)] bg-[var(--background)] text-gray-700 hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>{category}</button>
                  )) : <p className="text-sm text-gray-500">Categories will appear as topics are added to the blog.</p>}
                </div>
              </div>
            </div>
            {moreArticles.length > 0 && <div className="mt-8 border-t border-[var(--line)] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">More to read</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Continue with these articles</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {moreArticles.slice(0, 4).map((blog) => <Link key={blog.id || blog._id} href={`/blog/${blog.slug}`} className="group rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 transition hover:border-[var(--accent)]">
                  <span className="block line-clamp-2 font-semibold text-gray-900 group-hover:text-[var(--accent)]">{blog.title}</span>
                  <span className="mt-2 block text-xs text-gray-500">{blog.category || "Blog"} · {blog.readTime || calculateReadTime(blog.excerpt || "")} · {formatPublishedDate(blog.publishedAt || blog.createdAt)}</span>
                  <span className="mt-3 block line-clamp-2 text-sm leading-relaxed text-gray-600">{blog.excerpt || "Open this article for more ideas and insights from the blog."}</span>
                </Link>)}
              </div>
            </div>}
          </section>
        )}

        {!loading && displayedBlogs.length > 0 && (
          <section aria-labelledby="blog-pulse-heading" className="ui-card mt-8 overflow-hidden p-5 sm:p-7">
            <div className="flex flex-col gap-2 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Editorial analytics</p>
                <h2 id="blog-pulse-heading" className="mt-1 text-xl font-semibold text-gray-900">Publication performance</h2>
                <p className="mt-1 text-sm text-gray-500">Engagement across the published journal</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> Live totals
              </span>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.8fr_0.9fr]">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Article comparison</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">Article performance curve</h3>
                    <p className="mt-1 text-xs text-gray-500">{chartMetric === "views" ? "Leading articles across the journal" : "Current page articles, ranked by metric"}</p>
                  </div>
                  <div role="group" aria-label="Choose chart metric" className="inline-flex w-fit rounded-lg border border-[var(--line)] bg-[var(--background)] p-1">
                    {chartMetricOptions.map((metric) => (
                      <button key={metric.key} type="button" aria-pressed={chartMetric === metric.key} onClick={() => setChartMetric(metric.key)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 ${chartMetric === metric.key ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasChartData ? (
                  <div className="mt-4 overflow-x-auto">
                    <svg role="group" aria-label={`${currentChartMetric.label} by article, sorted highest to lowest`} viewBox="0 0 740 250" className="h-[230px] min-w-[560px] w-full sm:h-[260px]">
                      <defs>
                        <linearGradient id="editorial-curve-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={currentChartMetric.color} stopOpacity="0.24" />
                          <stop offset="100%" stopColor={currentChartMetric.color} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {Array.from({ length: 5 }, (_, index) => {
                        const y = 20 + (index * 170) / 4;
                        const value = Math.round(chartAxisMaximum * (1 - index / 4));
                        return (
                          <g key={`${value}-${index}`}>
                            <text x="43" y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{value.toLocaleString()}</text>
                            <line x1="52" x2="710" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 6" />
                          </g>
                        );
                      })}
                      <path d={chartAreaPath} fill="url(#editorial-curve-fill)" pointerEvents="none" />
                      <path d={chartLinePath} fill="none" stroke={currentChartMetric.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                      {chartPoints.map((point, index) => {
                        const article = chartData[index].blog;
                        const isHovered = hoveredChartPoint === index;
                        const tooltipWidth = 190;
                        const tooltipX = Math.max(52, Math.min(point.x - tooltipWidth / 2, 710 - tooltipWidth));
                        const tooltipY = point.y < 70 ? point.y + 15 : point.y - 52;
                        const tooltipTitle = article.title.length > 28 ? `${article.title.slice(0, 27)}...` : article.title;

                        return (
                          <g
                            key={article.id || article._id || article.slug}
                            role="button"
                            tabIndex={0}
                            aria-label={`${article.title}: ${point.value.toLocaleString()} ${currentChartMetric.label.toLowerCase()}`}
                            onMouseEnter={() => setHoveredChartPoint(index)}
                            onMouseLeave={() => setHoveredChartPoint(null)}
                            onFocus={() => setHoveredChartPoint(index)}
                            onBlur={() => setHoveredChartPoint(null)}
                          >
                            <circle cx={point.x} cy={point.y} r="11" fill={currentChartMetric.color} opacity={isHovered ? "0.14" : "0"} style={{ transition: "opacity 180ms ease" }} />
                            <circle cx={point.x} cy={point.y} r={isHovered ? "7" : "4.5"} fill="var(--surface)" stroke={currentChartMetric.color} strokeWidth={isHovered ? "3" : "2.5"} style={{ cursor: "pointer", transition: "r 180ms ease, stroke-width 180ms ease" }}>
                              <title>{`${article.title}: ${point.value.toLocaleString()} ${currentChartMetric.label.toLowerCase()}`}</title>
                            </circle>
                            <g aria-hidden="true" pointerEvents="none" style={{ opacity: isHovered ? 1 : 0, transform: isHovered ? "translateY(0)" : "translateY(4px)", transition: "opacity 160ms ease, transform 160ms ease" }}>
                              <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="42" rx="7" fill="var(--surface)" stroke="var(--line)" />
                              <text x={tooltipX + 10} y={tooltipY + 17} fontSize="11" fontWeight="600" fill="var(--foreground)">{tooltipTitle}</text>
                              <text x={tooltipX + 10} y={tooltipY + 32} fontSize="10" fill="var(--muted)">{point.value.toLocaleString()} {currentChartMetric.label.toLowerCase()}</text>
                            </g>
                            <text x={point.x} y="222" textAnchor="middle" fontSize="10" fill="var(--muted)">#{index + 1}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="mt-4 flex h-[230px] items-center justify-center rounded-lg bg-[var(--background)] px-6 text-center sm:h-[260px]">
                    <div>
                      <p className="text-sm font-medium text-gray-700">No {currentChartMetric.label.toLowerCase()} recorded yet</p>
                      <p className="mt-1 text-xs text-gray-500">Article comparisons will appear as readers engage.</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentChartMetric.color }} />
                  {currentChartMetric.label} per article · {chartMetric === "views" ? "top published articles" : "current results"}
                </div>
              </div>

              <aside className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Attentive reading</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">Most viewed articles</h3>
                    <p className="mt-1 text-xs text-gray-500">Across the published journal</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500">{Number(analytics.totalViews || 0).toLocaleString()} views</span>
                </div>
                {analytics.topArticles.some((article) => Number(article.views) > 0) ? (
                  <ol className="mt-4 divide-y divide-[var(--line)]">
                    {analytics.topArticles.filter((article) => Number(article.views) > 0).map((blog, index) => (
                      <li key={blog.id || blog._id || blog.slug}>
                        <Link href={`/blog/${blog.slug}`} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">{index + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-sm font-medium text-gray-700 group-hover:text-[var(--accent)]">{blog.title}</span>
                            <span className="mt-1 block text-[11px] text-gray-500">{Number(blog.views).toLocaleString()} views · {Number(blog.likeCount || 0).toLocaleString()} likes</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="mt-4 flex min-h-44 items-center justify-center rounded-lg bg-[var(--surface)] px-5 text-center text-sm text-gray-500">
                    Reader activity will appear as article views are recorded.
                  </div>
                )}
              </aside>
            </div>

          </section>
        )}

        <div className="ui-card mt-12 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">Showing {displayedBlogs.length > 0 ? (page - 1) * BLOGS_PER_PAGE + 1 : 0}–{Math.min(page * BLOGS_PER_PAGE, pagination.totalBlogs)} of {pagination.totalBlogs} curated dispatches</p>
            <div className="flex items-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="ui-btn ui-btn-secondary min-h-9 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">← Previous</button>
              <div className="flex items-center gap-2">{Array.from({ length: Math.max(1, Math.min(5, pagination.totalPages || 1)) }, (_, idx) => { const pageNumber = idx + 1; return <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${pageNumber === page ? "bg-[var(--accent)] text-[var(--on-accent)]" : "bg-[var(--surface-muted)] text-gray-600"}`}>{pageNumber}</button>; })}</div>
              <button type="button" disabled={!pagination.hasNextPage} onClick={() => setPage((prev) => prev + 1)} className="ui-btn ui-btn-secondary min-h-9 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Next →</button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
          <div><div className="mb-4 flex items-center gap-3"><Link href="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--on-accent)]">B</span><span className="text-xl font-semibold text-gray-900">BlogCraft</span></Link></div><p className="max-w-xs text-base leading-relaxed text-gray-600">Engineering-led publishing platform built for scale, editorial precision, and modern technical knowledge sharing.</p></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Explore</h4><ul className="mt-4 space-y-3 text-sm text-gray-700"><li><Link href="/#blogs" className="transition hover:text-[var(--accent)] hover:underline">Latest articles</Link></li><li><Link href="/blogs" className="transition hover:text-[var(--accent)] hover:underline">All articles</Link></li></ul></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Workspaces</h4><ul className="mt-4 space-y-3 text-sm text-gray-700"><li><Link href="/employee/dashboard" className="transition hover:text-[var(--accent)] hover:underline">Employee dashboard</Link></li><li><Link href="/employee/profile" className="transition hover:text-[var(--accent)] hover:underline">Employee profile</Link></li><li><Link href="/admin/dashboard" className="transition hover:text-[var(--accent)] hover:underline">Admin dashboard</Link></li></ul></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Get started</h4><ul className="mt-4 space-y-3 text-sm text-gray-700"><li><Link href="/employee/blog/new" className="transition hover:text-[var(--accent)] hover:underline">Write an article</Link></li><li><Link href="/login" className="transition hover:text-[var(--accent)] hover:underline">Sign in</Link></li><li><Link href="/signup" className="transition hover:text-[var(--accent)] hover:underline">Create an account</Link></li></ul></div>
        </div>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 border-t border-[var(--line)] px-4 py-5 text-sm text-gray-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><p>© 2025 BlogCraft Media Platforms Inc. All editorial rights reserved.</p><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><Link href="/">Home</Link><Link href="/blogs">Explore blogs</Link><Link href="/login">Sign in</Link></div></div>
      </footer>
    </div>
  );
}
