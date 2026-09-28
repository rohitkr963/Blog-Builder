import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    const rate = checkRateLimit(request, "login", 10, 15 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const body = await request.json().catch(() => null);

    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const email = body.email.toString().trim().toLowerCase();
    const password = body.password.toString();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by normalized email
    const user = await User.findOne({ email });

    if (!user) {
      // Generic error message to prevent user enumeration
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare plain-text password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
      return NextResponse.json(
        { success: false, message: "Please verify your email before signing in." },
        { status: 403 }
      );
    }

    // Create JWT with user ID payload
    const token = signToken(user._id.toString());

    // Prepare response object
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Attach HTTP-only cookie securely
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error.message);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
