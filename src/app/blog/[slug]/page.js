"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import { calculateReadTime } from "@/components/blog/BlogCard";

export default function BlogDetailPage({ params }) {
  const { slug } = use(params);

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [likeData, setLikeData] = useState({ likeCount: 0, likedByCurrentUser: false });
  const [comments, setComments] = useState([]);
  const [commentForm, setCommentForm] = useState({ name: "", email: "", content: "" });
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [interactionError, setInteractionError] = useState("");
  const [commentSuccess, setCommentSuccess] = useState("");

  useEffect(() => {
    const fetchPublicBlog = async () => {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);

        const res = await fetch(`/api/public/blogs/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const data = await res.json();

        if (res.status === 404 || !data.success || !data.blog) {
          setNotFound(true);
          return;
        }

        setBlog(data.blog);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPublicBlog();
    }
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    async function loadEngagement() {
      try {
        const [likesResponse, commentsResponse] = await Promise.all([
          fetch(`/api/public/blogs/${slug}/like`),
          fetch(`/api/public/blogs/${slug}/comments`),
        ]);
        const [likesData, commentsData] = await Promise.all([
          likesResponse.json(),
          commentsResponse.json(),
        ]);

        if (!isMounted) return;
        if (likesResponse.ok && likesData.success) {
          setLikeData({
            likeCount: likesData.likeCount || 0,
            likedByCurrentUser: Boolean(likesData.likedByCurrentUser),
          });
        }
        if (commentsResponse.ok && commentsData.success) {
          setComments(commentsData.comments || []);
        }
        if (!likesResponse.ok || !commentsResponse.ok) {
          setInteractionError("Reader interactions could not be loaded.");
        }
      } catch {
        if (isMounted) setInteractionError("Reader interactions could not be loaded.");
      }
    }

    if (slug) loadEngagement();
    return () => { isMounted = false; };
  }, [slug]);

  const handleLike = async () => {
    setLikeLoading(true);
    setInteractionError("");

    try {
      const method = likeData.likedByCurrentUser ? "DELETE" : "POST";
      const response = await fetch(`/api/public/blogs/${slug}/like`, { method });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not update your like.");
      }

      setLikeData({
        likeCount: data.likeCount || 0,
        likedByCurrentUser: Boolean(data.likedByCurrentUser),
      });
    } catch (likeError) {
      setInteractionError(likeError.message || "Could not update your like.");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    setCommentLoading(true);
    setInteractionError("");
    setCommentSuccess("");

    try {
      const response = await fetch(`/api/public/blogs/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: commentForm.name.trim(),
          email: commentForm.email.trim(),
          content: commentForm.content.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not submit your comment.");
      }

      if (data.comment) setComments((current) => [data.comment, ...current]);
      setCommentForm({ name: "", email: "", content: "" });
      setCommentSuccess(data.message || "Your comment was posted.");
    } catch (commentError) {
      setInteractionError(commentError.message || "Could not submit your comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm">Loading article...</p>
        </div>
      </main>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Blog Builder
            </Link>
            <Link href="/login" className="text-sm font-medium text-blue-600">
              Sign In
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
            <div className="text-4xl">📄</div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Not Found</h1>
            <p className="text-sm text-gray-600">
              The article you requested does not exist or is not published.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { title, content, excerpt, coverImage, author, category, publishedAt, createdAt, views, tags } = blog;

  const displayDate = publishedAt || createdAt;
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const readTime = calculateReadTime(content || "");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header Navigation */}
      <PublicNavbar showBackLink={true} />

      {/* Main Article Section */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover Image Header */}
          {coverImage ? (
            <div className="w-full aspect-video max-h-96 overflow-hidden bg-gray-100">
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-700" />
          )}

          <div className="p-6 sm:p-10 space-y-6">
            {/* Category & Read Time Bar */}
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full uppercase tracking-wide">
                {category}
              </span>
              <div className="flex items-center gap-3">
                <span aria-label={`Estimated reading time: ${readTime}`}>{readTime}</span>
                <span>•</span>
                <span>{views} views</span>
              </div>
            </div>

            {/* Article Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {title}
            </h1>

            {/* Excerpt */}
            {excerpt && (
              <p className="text-lg text-gray-600 leading-relaxed font-normal italic border-l-4 border-blue-500 pl-4 py-1">
                {excerpt}
              </p>
            )}

            {/* Author & Date Bar */}
            <div className="flex items-center gap-3 py-4 border-y border-gray-100 text-sm">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base uppercase">
                {author?.name ? author.name.charAt(0) : "A"}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {author?.name || "Analyticsliv Author"}
                </p>
                <p className="text-xs text-gray-500">{formattedDate}</p>
              </div>
            </div>

            {/* Rich Text Article Body (HTML Rendered Safely) */}
            <div
              className="article-content pt-2"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-gray-200 py-4">
              <button
                type="button"
                aria-pressed={likeData.likedByCurrentUser}
                disabled={likeLoading}
                onClick={handleLike}
                className="ui-btn ui-btn-secondary px-4 py-2 text-sm"
              >
                {likeLoading ? "Updating..." : likeData.likedByCurrentUser ? "♥ Liked" : "♡ Like article"}
              </button>
              <span className="text-sm text-gray-600" aria-live="polite">
                {likeData.likeCount} {likeData.likeCount === 1 ? "like" : "likes"}
              </span>
            </div>

            {/* Article Tags */}
            {Array.isArray(tags) && tags.length > 0 && (
              <div className="pt-8 border-t border-gray-100 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>

        <section aria-labelledby="comments-title" className="mx-auto mt-8 max-w-3xl border-t border-gray-200 pt-8">
          <h2 id="comments-title" className="text-2xl font-bold text-gray-900">
            Reader comments ({comments.length})
          </h2>
          <p className="mt-2 text-sm text-gray-600">Join the conversation about this article.</p>

          {interactionError && <p role="alert" className="mt-4 text-sm text-red-700">{interactionError}</p>}
          {commentSuccess && <p role="status" className="mt-4 text-sm text-emerald-700">{commentSuccess}</p>}

          <form onSubmit={handleCommentSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comment-name" className="mb-1 block text-sm font-medium text-gray-800">Name</label>
              <input
                id="comment-name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                value={commentForm.name}
                onChange={(event) => setCommentForm((current) => ({ ...current, name: event.target.value }))}
                className="ui-input"
              />
            </div>
            <div>
              <label htmlFor="comment-email" className="mb-1 block text-sm font-medium text-gray-800">Email</label>
              <input
                id="comment-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={commentForm.email}
                onChange={(event) => setCommentForm((current) => ({ ...current, email: event.target.value }))}
                className="ui-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="comment-content" className="mb-1 block text-sm font-medium text-gray-800">Comment</label>
              <textarea
                id="comment-content"
                name="content"
                required
                maxLength={2000}
                rows={4}
                value={commentForm.content}
                onChange={(event) => setCommentForm((current) => ({ ...current, content: event.target.value }))}
                className="ui-textarea"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={commentLoading} className="ui-btn ui-btn-primary px-5 py-2.5">
                {commentLoading ? "Posting..." : "Post comment"}
              </button>
            </div>
          </form>

          {comments.length > 0 ? (
            <ol className="mt-8 divide-y divide-gray-200">
              {comments.map((comment) => (
                <li key={comment.id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{comment.name}</h3>
                    <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{comment.content}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-8 border-t border-gray-200 py-5 text-sm text-gray-600">No comments yet. Start the conversation.</p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <p>© 2026 Blog Builder Platform — Analyticsliv Hiring Assignment</p>
      </footer>
    </div>
  );
}
