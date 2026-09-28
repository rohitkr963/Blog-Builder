import { spawn, spawnSync } from "node:child_process";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import User from "../src/models/User.js";

const port = Number(process.env.SMOKE_PORT || 3100 + Math.floor(Math.random() * 1000));
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const testEmail = `smoke-${Date.now()}@example.com`;
const testPassword = "smoke-pass-123";
let server;

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

	await request("/api/auth/signup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Smoke Test User", email: testEmail, password: testPassword }),
	});

	const login = await request("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: testEmail, password: testPassword }),
	});
	if (login.user?.email !== testEmail || login.user?.role !== "EMPLOYEE") {
		throw new Error("Signup/login role contract failed.");
	}

	const publicBlogs = await request("/api/public/blogs?page=1&limit=1");
	if (!Array.isArray(publicBlogs.blogs) || !publicBlogs.pagination) {
		throw new Error("Public blog pagination contract failed.");
	}

	await request("/api/auth/logout", { method: "POST" });
	console.log("E2E smoke test passed.");
}

try {
	await main();
} finally {
	await connectDB().then(() => User.deleteOne({ email: testEmail })).catch(() => undefined);
	await mongoose.disconnect().catch(() => undefined);
	if (server) {
		if (process.platform === "win32") {
			spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
		} else {
			server.kill();
		}
	}
}
