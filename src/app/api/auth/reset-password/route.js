import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || password.length < 6) {
      return NextResponse.json({ success: false, message: "A valid token and password of at least 6 characters are required." }, { status: 400 });
    }

    await connectDB();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) return NextResponse.json({ success: false, message: "This reset link is invalid or expired." }, { status: 400 });

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error.message);
    return NextResponse.json({ success: false, message: "Could not reset password." }, { status: 500 });
  }
}