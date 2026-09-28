import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireEmployee } from "@/lib/auth";
import { uploadCoverImage } from "@/lib/cloudinary";
import User from "@/models/User";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function PATCH(request) {
  try {
    const { user, errorResponse } = await requireEmployee();
    if (errorResponse) return errorResponse;

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, message: "Invalid profile data." }, { status: 400 });
    }

    const name = String(formData.get("name") || "").trim();
    const department = String(formData.get("department") || "").trim();
    const bio = String(formData.get("bio") || "").trim();
    if (!name) return NextResponse.json({ success: false, message: "Name is required." }, { status: 400 });
    if (name.length > 80) return NextResponse.json({ success: false, message: "Name must be 80 characters or fewer." }, { status: 400 });
    if (department.length > 80) return NextResponse.json({ success: false, message: "Department must be 80 characters or fewer." }, { status: 400 });
    if (bio.length > 500) return NextResponse.json({ success: false, message: "Bio must be 500 characters or fewer." }, { status: 400 });

    const updates = { name, department, bio };
    const photo = formData.get("profilePhoto");
    if (photo && typeof photo !== "string" && photo.size > 0) {
      const mimeType = photo.type?.toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        return NextResponse.json({ success: false, message: "Choose a JPG, PNG, or WebP image." }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json({ success: false, message: "Profile photos must be 5 MB or smaller." }, { status: 400 });
      }
      const buffer = Buffer.from(await photo.arrayBuffer());
      const uploaded = await uploadCoverImage(buffer, mimeType, "blog-builder/profiles");
      updates.profilePhoto = uploaded.url;
    }

    await connectDB();
    const updatedUser = await User.findByIdAndUpdate(user.id, { $set: updates }, { new: true, runValidators: true })
      .select("name email role department bio profilePhoto createdAt")
      .lean();
    if (!updatedUser) return NextResponse.json({ success: false, message: "Profile not found." }, { status: 404 });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department || "",
        bio: updatedUser.bio || "",
        profilePhoto: updatedUser.profilePhoto || "",
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("PATCH employee profile error:", error.message);
    return NextResponse.json({ success: false, message: "Could not update your profile." }, { status: 500 });
  }
}
