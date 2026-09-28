"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

const statuses = ["", "PENDING", "APPROVED", "REJECTED"];

export default function AdminCommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchComments() {
      if (active) {
        setLoading(true);
        setError("");
      }
      try {
        const query = status ? `?status=${status}` : "";
        const response = await fetch(`/api/admin/comments${query}`);
        const data = await response.json();
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok || !data.success) throw new Error(data.message || "Could not load comments.");
        if (active) setComments(data.comments || []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchComments();
    return () => { active = false; };
  }, [router, status]);

  async function updateComment(id, nextStatus) {
    const response = await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Could not update comment.");
    setComments((current) => current.filter((comment) => comment.id !== id));
  }

  async function deleteComment(id) {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      const response = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not delete comment.");
      setComments((current) => current.filter((comment) => comment.id !== id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <DashboardShell role="admin" title="Comment moderation" subtitle="Review reader comments before they appear publicly." actions={<Link href="/admin/dashboard" className="ui-btn ui-btn-ghost">Back to dashboard</Link>}>
      <div className="ui-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="comment-status">Show status</label>
          <select id="comment-status" value={status} onChange={(event) => setStatus(event.target.value)} className="ui-select max-w-xs">
            {statuses.map((value) => <option key={value || "ALL"} value={value}>{value || "ALL"}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-gray-500">Loading comments...</p> : comments.length === 0 ? <p className="mt-8 text-sm text-gray-500">No comments in this queue.</p> : (
          <div className="mt-6 space-y-4">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{comment.name} <span className="font-normal text-gray-500">({comment.email})</span></p>
                    <p className="mt-1 text-xs text-gray-500">{comment.blog?.title || "Deleted article"} · {new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{comment.status}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{comment.content}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {comment.status !== "APPROVED" && <button type="button" onClick={() => updateComment(comment.id, "APPROVED")} className="ui-btn ui-btn-primary px-3 py-2 text-xs">Approve</button>}
                  {comment.status !== "REJECTED" && <button type="button" onClick={() => updateComment(comment.id, "REJECTED")} className="ui-btn ui-btn-ghost px-3 py-2 text-xs">Reject</button>}
                  <button type="button" onClick={() => deleteComment(comment.id)} className="ui-btn px-3 py-2 text-xs text-red-700">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}