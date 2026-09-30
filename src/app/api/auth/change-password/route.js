import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import User from "@/models/User";

export async function POST(request) {
  try {
    const rate = checkRateLimit(request, "change-password", 5, 15 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: "Current and new passwords are required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, message: "New password must be at least 8 characters." }, { status: 400 });
    }
    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      return NextResponse.json({ success: false, message: "New password must be 72 bytes or fewer." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ success: false, message: "Choose a password different from your current one." }, { status: 400 });
    }

    await connectDB();
    const account = await User.findById(user.id).select("password");
    if (!account) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 404 });
    }

    const currentPasswordMatches = await bcrypt.compare(currentPassword, account.password);
    if (!currentPasswordMatches) {
      return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 400 });
    }

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error.message);
    return NextResponse.json({ success: false, message: "Could not update password." }, { status: 500 });
  }
}