import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

/**
 * POST /api/auth/signup
 * Public user registration endpoint.
 *
 * Requirements:
 * - name, email, password (min 6 chars) required
 * - Always forces role = "EMPLOYEE" (prevents ADMIN escalation)
 * - Hashes password with bcryptjs
 * - Rejects duplicate emails with 409 Conflict
 * - Returns 201 Created on success
 */
export async function POST(request) {
  try {
    const rate = checkRateLimit(request, "signup", 5, 60 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { name, email, password } = body;

    // Validation: name required
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    // Validation: email required
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Validation: password required and min 6 chars
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required and must be at least 6 characters long",
        },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    await connectDB();

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password securely using bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user record — ALWAYS force role = "EMPLOYEE"
    const verificationToken = randomBytes(32).toString("hex");
    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "EMPLOYEE",
      emailVerificationTokenHash: createHash("sha256").update(verificationToken).digest("hex"),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    await sendVerificationEmail({
      email: newUser.email,
      verifyUrl: `${baseUrl}/verify-email?token=${verificationToken}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/signup error:", error.message);

    // Handle Mongoose duplicate key error if race condition occurs
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error during signup" },
      { status: 500 }
    );
  }
}
