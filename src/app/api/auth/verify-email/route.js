import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ success: false, message: "Verification token is required." }, { status: 400 });

    await connectDB();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return NextResponse.json({ success: false, message: "This verification link is invalid or expired." }, { status: 400 });

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    console.error("POST /api/auth/verify-email error:", error.message);
    return NextResponse.json({ success: false, message: "Could not verify email." }, { status: 500 });
  }
}