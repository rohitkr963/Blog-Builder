import { spawn, spawnSync } from "node:child_process";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import Blog from "../src/models/Blog.js";
import Comment from "../src/models/Comment.js";
import User from "../src/models/User.js";

const port = Number(process.env.SMOKE_PORT || 3100 + Math.floor(Math.random() * 1000));
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const testEmail = `smoke-${Date.now()}@example.com`;
const testPassword = "smoke-pass-123";
let server;
let testBlogId;

async function request(path, options) {
	const response = await fetch(`${baseUrl}${path}`, options);
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(`${path} returned ${response.status}: ${data.message || "request failed"}`);
	return data;
}

async function waitForServer() {
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${baseUrl}/api/health`);
			if (response.ok) return;
		} catch {
			// The server is still starting.
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error("Production server did not become ready within 30 seconds.");
}

async function main() {
	if (!process.env.BASE_URL) {
		const command = process.platform === "win32" ? "cmd.exe" : "npm";
		const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run start"] : ["run", "start"];
		server = spawn(command, args, {
			env: { ...process.env, PORT: String(port) },
			stdio: "inherit",
		});
		await waitForServer();
	}

	const health = await request("/api/health");
	if (health.database !== "connected") throw new Error("Health endpoint did not report a connected database.");
	const homePage = await fetch(`${baseUrl}/`, { redirect: "manual" });
	const loginPage = await fetch(`${baseUrl}/login`, { redirect: "manual" });
	const blogsPage = await fetch(`${baseUrl}/blogs`, { redirect: "manual" });
	const anonymousBlogApi = await fetch(`${baseUrl}/api/public/blogs/anonymous-test`, { redirect: "manual" });
	if (homePage.status !== 200 || loginPage.status !== 200) {
		throw new Error("Homepage and login must remain accessible without authentication.");
	}
	if (![307, 308].includes(blogsPage.status) || !blogsPage.headers.get("location")?.includes("/login")) {
		throw new Error("Blog listing page should redirect anonymous users to login.");
	}
	if (anonymousBlogApi.status !== 401) {
		throw new Error("Public blog detail API should reject anonymous users.");
	}

	await request("/api/auth/signup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Smoke Test User", email: testEmail, password: testPassword }),
	});

	 const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testEmail, password: testPassword }),
	});
		const login = await loginResponse.json();
	if (login.user?.email !== testEmail || login.user?.role !== "EMPLOYEE") {
		throw new Error("Signup/login role contract failed.");
	}
		const authCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
		if (!authCookie) throw new Error("Login did not return an authentication cookie.");
		const authHeaders = { "Content-Type": "application/json", Cookie: authCookie };

	const publicBlogs = await request("/api/public/blogs?page=1&limit=1");
	if (!Array.isArray(publicBlogs.blogs) || !publicBlogs.pagination) {
		throw new Error("Public blog pagination contract failed.");
	}

	const createdBlog = await request("/api/blogs", {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			title: `Smoke Test Blog ${Date.now()}`,
			content: "<p>Smoke test content.</p>",
			category: "Testing",
			status: "PUBLISHED",
		}),
	});
	testBlogId = createdBlog.blog?._id;
	const originalSlug = createdBlog.blog?.slug;
	if (!testBlogId || !originalSlug) throw new Error("Published blog creation contract failed.");

	const updatedBlog = await request(`/api/blogs/${testBlogId}`, {
		method: "PUT",
		headers: authHeaders,
		body: JSON.stringify({ title: "Smoke Test Blog After Rename" }),
	});
	if (updatedBlog.blog?.slug !== originalSlug) {
		throw new Error("Editing a blog title changed its public slug.");
	}

	const anonymousArticlePage = await fetch(`${baseUrl}/blog/${originalSlug}`, { redirect: "manual" });
	const anonymousArticleApi = await fetch(`${baseUrl}/api/public/blogs/${originalSlug}`, { redirect: "manual" });
	if (![307, 308].includes(anonymousArticlePage.status) || anonymousArticleApi.status !== 401) {
		throw new Error("Anonymous users should not access blog details or their API.");
	}
	const authenticatedPublicBlog = await request(`/api/public/blogs/${originalSlug}`, { headers: { Cookie: authCookie } });
	if (authenticatedPublicBlog.blog?.title !== "Smoke Test Blog After Rename") {
		throw new Error("Authenticated users should be able to read published blogs.");
	}

	const commentResult = await request(`/api/public/blogs/${originalSlug}/comments`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Cookie: authCookie },
		body: JSON.stringify({
			name: "Smoke Test Reader",
			email: testEmail,
			content: "Smoke test comment.",
		}),
	});
	if (commentResult.message !== "Your comment was posted." || !commentResult.comment?.id) {
		throw new Error("Public comment submission contract failed.");
	}
	await connectDB();
	const savedComment = await Comment.findOne({ blog: testBlogId, email: testEmail }).lean();
	if (!savedComment || savedComment.status !== "APPROVED") {
		throw new Error("Submitted comment was not immediately approved.");
	}
	const publicComments = await request(`/api/public/blogs/${originalSlug}/comments`, { headers: { Cookie: authCookie } });
	if (publicComments.count !== 1 || publicComments.comments?.[0]?.content !== "Smoke test comment.") {
		throw new Error("Submitted comment was not immediately visible publicly.");
	}

	await request("/api/auth/logout", { method: "POST", headers: { Cookie: authCookie } });
	console.log("E2E smoke test passed.");
}

try {
	await main();
} finally {
	await connectDB().then(async () => {
		if (testBlogId) {
			await Comment.deleteMany({ blog: testBlogId });
			await Blog.deleteOne({ _id: testBlogId });
		}
		await User.deleteOne({ email: testEmail });
	}).catch(() => undefined);
	await mongoose.disconnect().catch(() => undefined);
	if (server) {
		if (process.platform === "win32") {
			spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
		} else {
			server.kill();
		}
	}
}
