"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/navigation/PublicNavbar";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", department: "", bio: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [profileResponse, blogsResponse] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/blogs"),
        ]);
        if (profileResponse.status === 401 || blogsResponse.status === 401) {
          router.push("/login");
          return;
        }
        const [profileData, blogsData] = await Promise.all([profileResponse.json(), blogsResponse.json()]);
        if (!active) return;
        if (!profileResponse.ok || !profileData.success) throw new Error("Could not load your profile.");
        if (!blogsResponse.ok || !blogsData.success) throw new Error(blogsData.message || "Could not load your articles.");
        if (profileData.user.role !== "EMPLOYEE") {
          router.replace("/admin/dashboard");
          return;
        }
        setEmployee(profileData.user);
        setForm({ name: profileData.user.name || "", department: profileData.user.department || "", bio: profileData.user.bio || "" });
        setPhotoPreview(profileData.user.profilePhoto || "");
        setBlogs(blogsData.blogs || []);
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
  }, [router]);

  const publishedBlogs = blogs.filter((blog) => blog.status === "PUBLISHED");
  const draftBlogs = blogs.filter((blog) => blog.status === "DRAFT");
  const totalReads = blogs.reduce((sum, blog) => sum + (Number(blog.views) || 0), 0);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type.toLowerCase())) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.set("name", form.name);
      payload.set("department", form.department);
      payload.set("bio", form.bio);
      if (photoFile) payload.set("profilePhoto", photoFile);
      const response = await fetch("/api/employee/profile", { method: "PATCH", body: payload });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not save your profile.");
      const latestResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const latestData = await latestResponse.json();
      const savedUser = latestResponse.ok && latestData.success ? latestData.user : data.user;
      setEmployee(savedUser);
      setForm({ name: savedUser.name || "", department: savedUser.department || "", bio: savedUser.bio || "" });
      setPhotoPreview(savedUser.profilePhoto || "");
      setPhotoFile(null);
      setEditing(false);
      setSuccess("Your profile has been updated.");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (saveError) {
      setError(saveError.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <Link href="/employee/dashboard" className="text-sm font-medium text-[var(--accent)] hover:underline">← Employee Studio</Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Your account</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Employee profile</h1>
            <p className="mt-2 text-sm text-gray-600">Your profile details and publishing activity.</p>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="ui-card h-56 animate-pulse" />
          ) : employee ? (
            <>
              <section className="ui-card overflow-hidden">
                <div className="h-28 bg-[var(--accent-soft)]" />
                <div className="px-6 pb-7 sm:px-8">
                  <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-end gap-4">
                      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--accent)] text-3xl font-semibold text-[var(--on-accent)] shadow-sm">
                        {photoPreview ? (
                          <Image
                            src={photoPreview}
                            alt="Profile"
                            fill
                            sizes="96px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          employee.name?.charAt(0)?.toUpperCase() || "E"
                        )}
                      </div>
                      <div className="pb-1">
                        <h2 className="text-2xl font-semibold text-gray-900">{employee.name}</h2>
                        <p className="mt-1 text-sm text-gray-600">{employee.department || "Employee"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => {
                        if (editing) {
                          setForm({ name: employee.name || "", department: employee.department || "", bio: employee.bio || "" });
                          setPhotoPreview(employee.profilePhoto || "");
                          setPhotoFile(null);
                        }
                        setEditing((value) => !value);
                        setError("");
                        setSuccess("");
                      }} className="ui-btn ui-btn-secondary min-h-10 px-4">{editing ? "Cancel edit" : "Edit profile"}</button>
                      <Link href="/employee/dashboard" className="ui-btn ui-btn-secondary min-h-10 px-4">Manage articles</Link>
                    </div>
                  </div>

                  {editing ? (
                    <form onSubmit={handleSaveProfile} className="mt-8 space-y-5 border-t border-[var(--line)] pt-6">
                      <div>
                        <label htmlFor="profile-photo" className="mb-2 block text-sm font-medium text-gray-700">Profile photo <span className="font-normal text-gray-500">(JPG, PNG, or WebP; max 5 MB)</span></label>
                        <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="ui-input block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:font-semibold file:text-[var(--accent)]" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                          <input id="profile-name" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="ui-input min-h-11" />
                        </div>
                        <div>
                          <label htmlFor="profile-department" className="mb-1.5 block text-sm font-medium text-gray-700">Department</label>
                          <input id="profile-department" maxLength={80} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="ui-input min-h-11" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-medium text-gray-700">About you</label>
                        <textarea id="profile-bio" maxLength={500} rows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="ui-input min-h-24 resize-y py-3" placeholder="Share a little about your work and interests" />
                        <p className="mt-1 text-right text-xs text-gray-500">{form.bio.length}/500</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                        <p className="mt-1 text-sm text-gray-700">{employee.email} <span className="text-gray-500">(cannot be changed here)</span></p>
                      </div>
                      <button type="submit" disabled={saving} className="ui-btn ui-btn-primary min-h-11 px-5 disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
                    </form>
                  ) : (
                  <dl className="mt-8 grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt>
                      <dd className="mt-1 break-all text-sm text-gray-900">{employee.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</dt>
                      <dd className="mt-1 text-sm text-gray-900">{employee.department || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account type</dt>
                      <dd className="mt-1 text-sm text-gray-900">Employee</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member since</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(employee.createdAt)}</dd>
                    </div>
                    {employee.bio && <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">About</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{employee.bio}</dd></div>}
                  </dl>
                  )}
                </div>
              </section>

              {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

              <section className="grid gap-4 sm:grid-cols-3" aria-label="Publishing statistics">
                {[
                  ["Total articles", blogs.length],
                  ["Published", publishedBlogs.length],
                  ["Total reads", totalReads.toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="ui-card p-5">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{loading ? "—" : value}</p>
                  </div>
                ))}
              </section>

              <section className="ui-card p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Your recent articles</h2>
                    <p className="mt-1 text-sm text-gray-600">Published posts and drafts from your account.</p>
                  </div>
                  <Link href="/employee/blog/new" className="ui-btn ui-btn-primary min-h-10 px-4">Write article</Link>
                </div>
                {blogs.length ? (
                  <ul className="mt-5 divide-y divide-[var(--line)]">
                    {blogs.slice(0, 6).map((blog) => (
                      <li key={blog._id || blog.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{blog.title || "Untitled draft"}</p>
                          <p className="mt-1 text-xs text-gray-500">{blog.category || "Uncategorized"} · Updated {formatDate(blog.updatedAt || blog.createdAt)}</p>
                        </div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${blog.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {blog.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] p-8 text-center">
                    <p className="text-sm text-gray-600">You haven&apos;t written an article yet.</p>
                    <Link href="/employee/blog/new" className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">Write your first article</Link>
                  </div>
                )}
                {draftBlogs.length > 0 && <p className="mt-3 text-xs text-gray-500">{draftBlogs.length} {draftBlogs.length === 1 ? "draft" : "drafts"} in your studio</p>}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
