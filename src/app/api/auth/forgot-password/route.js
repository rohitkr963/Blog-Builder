import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import User from "@/models/User";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

export async function POST(request) {
  try {
    const rate = checkRateLimit(request, "forgot-password", 5, 15 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt email");
    if (!user) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });

    const rawToken = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = createHash("sha256").update(rawToken).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    await sendPasswordResetEmail({
      email: user.email,
      resetUrl: `${baseUrl}/reset-password?token=${rawToken}`,
    });

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error.message);
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }
}