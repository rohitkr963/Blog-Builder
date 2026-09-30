import { spawn, spawnSync } from "node:child_process";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/lib/db.js";
import Blog from "../src/models/Blog.js";
import Comment from "../src/models/Comment.js";
import Like from "../src/models/Like.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Tag from "../src/models/Tag.js";
import { measurePasswordStrength } from "../src/lib/password-strength.js";

const port = Number(process.env.SMOKE_PORT || 3100 + Math.floor(Math.random() * 1000));
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const testEmail = `smoke-${Date.now()}@example.com`;
const testPassword = "smoke-pass-123";
const testAdminEmail = `smoke-admin-${Date.now()}@example.com`;
const testAdminPassword = "smoke-admin-pass-123";
const secondEmployeeEmail = `smoke-second-${Date.now()}@example.com`;
const secondEmployeePassword = "smoke-second-pass-123";
const taxonomySuffix = Date.now().toString();
let server;
let testBlogId;
let testCategoryId;
let testTagId;

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
	if (measurePasswordStrength("abcdefgh").meetsMinimum !== true || measurePasswordStrength("abcdefgh").label !== "Weak") {
		throw new Error("Password strength meter did not classify a weak 8-character password correctly.");
	}
	if (measurePasswordStrength("R0ck#SolidPass").label !== "Strong") {
		throw new Error("Password strength meter did not classify a strong mixed password correctly.");
	}

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
	await connectDB();
	await User.create({
		name: "Smoke Test Admin",
		email: testAdminEmail,
		password: await bcrypt.hash(testAdminPassword, 10),
		role: "ADMIN",
	});
	const homePage = await fetch(`${baseUrl}/`, { redirect: "manual" });
	const loginPage = await fetch(`${baseUrl}/login`, { redirect: "manual" });
	const blogsPage = await fetch(`${baseUrl}/blogs`, { redirect: "manual" });
	const anonymousBlogApi = await fetch(`${baseUrl}/api/public/blogs/anonymous-test`, { redirect: "manual" });
	const anonymousPasswordChange = await fetch(`${baseUrl}/api/auth/change-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ currentPassword: testPassword, newPassword: "smoke-pass-456" }),
	});
	if (homePage.status !== 200 || loginPage.status !== 200) {
		throw new Error("Homepage and login must remain accessible without authentication.");
	}
	if (![307, 308].includes(blogsPage.status) || !blogsPage.headers.get("location")?.includes("/login")) {
		throw new Error("Blog listing page should redirect anonymous users to login.");
	}
	if (anonymousBlogApi.status !== 401) {
		throw new Error("Public blog detail API should reject anonymous users.");
	}
	if (anonymousPasswordChange.status !== 401) {
		throw new Error("Password changes should require authentication.");
	}
	const shortLogin = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testEmail, password: "short7!" }),
	});
	const shortSignup = await fetch(`${baseUrl}/api/auth/signup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Short Password", email: `short-${Date.now()}@example.com`, password: "short7!" }),
	});
	if (shortLogin.status !== 400 || shortSignup.status !== 400) {
		throw new Error("Login and signup APIs should reject passwords shorter than 8 characters.");
	}

	await request("/api/auth/signup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Smoke Test User", email: testEmail, password: testPassword, role: "ADMIN" }),
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
	const setCookieHeader = loginResponse.headers.get("set-cookie") || "";
	if (new URL(baseUrl).protocol === "http:" && /;\s*secure(?:;|$)/i.test(setCookieHeader)) {
		throw new Error("HTTP login responses must not mark the session cookie Secure.");
	}
		const authHeaders = { "Content-Type": "application/json", Cookie: authCookie };
	const authenticatedEmployeePage = await fetch(`${baseUrl}/employee/dashboard`, {
		headers: { Cookie: authCookie },
		redirect: "manual",
	});
	if (authenticatedEmployeePage.status !== 200) {
		throw new Error("A valid login cookie should open protected employee pages.");
	}
	const adminLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testAdminEmail, password: testAdminPassword }),
	});
	const adminLogin = await adminLoginResponse.json();
	const adminCookie = adminLoginResponse.headers.get("set-cookie")?.split(";")[0];
	if (!adminLoginResponse.ok || adminLogin.user?.role !== "ADMIN" || !adminCookie) {
		throw new Error("Admin login and role contract failed.");
	}
	const adminHeaders = { "Content-Type": "application/json", Cookie: adminCookie };
	const adminDashboard = await fetch(`${baseUrl}/admin/dashboard`, {
		headers: { Cookie: adminCookie },
		redirect: "manual",
	});
	if (adminDashboard.status !== 200) throw new Error("Authenticated Admin could not open the dashboard.");

	const employeeAdminApi = await fetch(`${baseUrl}/api/admin/blogs`, { headers: { Cookie: authCookie } });
	if (employeeAdminApi.status !== 403) throw new Error("Employee was able to access an Admin-only API.");

	const secondEmployee = await request("/api/admin/employees", {
		method: "POST",
		headers: adminHeaders,
		body: JSON.stringify({ name: "Smoke Test Second Employee", email: secondEmployeeEmail, password: secondEmployeePassword }),
	});
	if (!secondEmployee.success || !secondEmployee.employee?.id) {
		throw new Error("Admin employee creation failed.");
	}
	const employeeList = await request("/api/admin/employees", { headers: { Cookie: adminCookie } });
	if (!employeeList.employees.some((employee) => employee.email === testEmail) || !employeeList.employees.some((employee) => employee.email === secondEmployeeEmail)) {
		throw new Error("Admin employee list did not include the smoke employees.");
	}
	const storedSecondEmployee = await User.findOne({ email: secondEmployeeEmail }).select("password").lean();
	if (!storedSecondEmployee || !(await bcrypt.compare(secondEmployeePassword, storedSecondEmployee.password))) {
		throw new Error("Admin-created employee password hash did not match the submitted password.");
	}
	const publicBlogs = await request("/api/public/blogs?page=1&limit=1");
	if (!Array.isArray(publicBlogs.blogs) || !publicBlogs.pagination) {
		throw new Error("Public blog pagination contract failed.");
	}

	const categoryName = `Smoke Category ${taxonomySuffix}`;
	const tagName = `smoke-tag-${taxonomySuffix}`;
	const createdCategory = await request("/api/admin/categories", {
		method: "POST",
		headers: adminHeaders,
		body: JSON.stringify({ name: categoryName }),
	});
	testCategoryId = createdCategory.category?.id;
	const createdTag = await request("/api/admin/tags", {
		method: "POST",
		headers: adminHeaders,
		body: JSON.stringify({ name: tagName }),
	});
	testTagId = createdTag.tag?.id;
	if (!testCategoryId || !testTagId) throw new Error("Admin category/tag creation failed.");
	const employeeTaxonomyWrite = await fetch(`${baseUrl}/api/admin/categories`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({ name: `Unauthorized ${taxonomySuffix}` }),
	});
	if (employeeTaxonomyWrite.status !== 403) throw new Error("Employee was able to manage Admin taxonomy.");

	const createdBlog = await request("/api/blogs", {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
		title: `Smoke Test Blog ${taxonomySuffix}`,
			content: "<p>Smoke test content.</p>",
			category: categoryName,
			tags: [tagName],
			status: "DRAFT",
		}),
	});
	testBlogId = createdBlog.blog?._id;
	const originalSlug = createdBlog.blog?.slug;
	if (!testBlogId || !originalSlug) throw new Error("Published blog creation contract failed.");
	const draftPublicResponse = await fetch(`${baseUrl}/api/public/blogs/${originalSlug}`, { headers: { Cookie: authCookie } });
	if (draftPublicResponse.status !== 404) throw new Error("Draft blog was visible through the public detail API.");

	const updatedBlog = await request(`/api/blogs/${testBlogId}`, {
		method: "PUT",
		headers: authHeaders,
		body: JSON.stringify({ title: "Smoke Test Blog After Rename", status: "PUBLISHED" }),
	});
	if (updatedBlog.blog?.slug !== originalSlug) {
		throw new Error("Editing a blog title changed its public slug.");
	}
	if (updatedBlog.blog?.status !== "PUBLISHED") throw new Error("Employee could not publish their draft.");

	const anonymousArticlePage = await fetch(`${baseUrl}/blog/${originalSlug}`, { redirect: "manual" });
	const anonymousArticleApi = await fetch(`${baseUrl}/api/public/blogs/${originalSlug}`, { redirect: "manual" });
	if (![307, 308].includes(anonymousArticlePage.status) || anonymousArticleApi.status !== 401) {
		throw new Error("Anonymous users should not access blog details or their API.");
	}
	const authenticatedPublicBlog = await request(`/api/public/blogs/${originalSlug}`, { headers: { Cookie: authCookie } });
	if (authenticatedPublicBlog.blog?.title !== "Smoke Test Blog After Rename") {
		throw new Error("Authenticated users should be able to read published blogs.");
	}
	const secondEmployeeLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: secondEmployeeEmail, password: secondEmployeePassword }),
	});
	const secondEmployeeLogin = await secondEmployeeLoginResponse.json();
	const secondEmployeeCookie = secondEmployeeLoginResponse.headers.get("set-cookie")?.split(";")[0];
	if (!secondEmployeeLoginResponse.ok || secondEmployeeLogin.user?.role !== "EMPLOYEE" || !secondEmployeeCookie) {
		throw new Error(`Admin-created Employee could not sign in (${secondEmployeeLoginResponse.status}): ${secondEmployeeLogin.message || "no message"}.`);
	}
	const ownershipResponse = await fetch(`${baseUrl}/api/blogs/${testBlogId}`, {
		headers: { Cookie: secondEmployeeCookie },
	});
	if (ownershipResponse.status !== 403) throw new Error("Employee could access another employee's blog.");
	const emptyEmployeeRemoval = await fetch(`${baseUrl}/api/admin/employees/${secondEmployee.employee.id}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	if (!emptyEmployeeRemoval.ok) throw new Error("Admin could not remove an employee without blog posts.");
	const blockedEmployeeRemoval = await fetch(`${baseUrl}/api/admin/employees/${login.user.id}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	if (blockedEmployeeRemoval.status !== 409) throw new Error("Admin employee removal did not protect an employee with authored blogs.");
	const blockedCategoryRemoval = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	const blockedTagRemoval = await fetch(`${baseUrl}/api/admin/tags/${testTagId}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	if (blockedCategoryRemoval.status !== 409 || blockedTagRemoval.status !== 409) {
		throw new Error("Admin deletion guards did not protect taxonomy used by a blog.");
	}
	const adminEdit = await request(`/api/admin/blogs/${testBlogId}`, {
		method: "PUT",
		headers: adminHeaders,
		body: JSON.stringify({ excerpt: "Updated by the smoke Admin." }),
	});
	if (adminEdit.blog?.excerpt !== "Updated by the smoke Admin." || adminEdit.blog?.author?._id?.toString() !== login.user.id) {
		throw new Error("Admin could not edit another user's blog while preserving its author.");
	}
	const adminBlogList = await request("/api/admin/blogs", { headers: { Cookie: adminCookie } });
	if (!adminBlogList.blogs.some((blog) => blog.id === testBlogId)) throw new Error("Admin blog list omitted the test article.");

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
	const adminUnpublish = await fetch(`${baseUrl}/api/admin/blogs/${testBlogId}`, {
		method: "PATCH",
		headers: { Cookie: adminCookie },
	});
	if (!adminUnpublish.ok) throw new Error("Admin could not unpublish an employee blog.");
	const unpublishedDetail = await fetch(`${baseUrl}/api/public/blogs/${originalSlug}`, { headers: { Cookie: authCookie } });
	if (unpublishedDetail.status !== 404) throw new Error("Unpublished blog remained publicly accessible.");
	const adminDelete = await fetch(`${baseUrl}/api/admin/blogs/${testBlogId}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	if (!adminDelete.ok) throw new Error("Admin could not delete an employee blog.");
	testBlogId = null;
	const categoryRemoval = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	const tagRemoval = await fetch(`${baseUrl}/api/admin/tags/${testTagId}`, {
		method: "DELETE",
		headers: { Cookie: adminCookie },
	});
	if (!categoryRemoval.ok || !tagRemoval.ok) throw new Error("Unused smoke taxonomy could not be removed.");
	testCategoryId = null;
	testTagId = null;

	const newPassword = "smoke-pass-456";
	await request("/api/auth/change-password", {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({ currentPassword: testPassword, newPassword }),
	});
	const oldPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testEmail, password: testPassword }),
	});
	if (oldPasswordLogin.status !== 401) throw new Error("The old password remained valid after password change.");
	const newPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testEmail, password: newPassword }),
	});
	if (!newPasswordLogin.ok) throw new Error("The new password could not be used to sign in.");

	await request("/api/auth/logout", { method: "POST", headers: { Cookie: authCookie } });
	console.log("E2E smoke test passed.");
}

try {
	await main();
} finally {
	await connectDB().then(async () => {
		if (testBlogId) {
			await Comment.deleteMany({ blog: testBlogId });
			await Like.deleteMany({ blog: testBlogId });
			await Blog.deleteOne({ _id: testBlogId });
		}
		if (testCategoryId) await Category.deleteOne({ _id: testCategoryId });
		if (testTagId) await Tag.deleteOne({ _id: testTagId });
		await User.deleteOne({ email: testEmail });
		await User.deleteOne({ email: testAdminEmail });
		await User.deleteOne({ email: secondEmployeeEmail });
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
