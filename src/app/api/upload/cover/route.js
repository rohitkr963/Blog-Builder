import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadCoverImage } from "@/lib/cloudinary";

// Maximum allowed file size: 5 MB in bytes
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

/**
 * POST /api/upload/cover
 * Upload cover image to Cloudinary.
 * Requires authentication (ADMIN or EMPLOYEE).
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Invalid form data request" },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "Image file is required" },
        { status: 400 }
      );
    }

    // 1. Validate File MIME Type
    const mimeType = file.type?.toLowerCase();
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid file type. Only JPEG, PNG, and WEBP images are allowed.",
        },
        { status: 400 }
      );
    }

    // 2. Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size exceeds the 5MB limit. Please upload a smaller image.",
        },
        { status: 400 }
      );
    }

    // Convert Web File stream/blob to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload via Cloudinary SDK server helper
    const uploadResult = await uploadCoverImage(buffer, mimeType);

    return NextResponse.json({
      success: true,
      message: "Cover image uploaded successfully",
      url: uploadResult.url,
      publicId: uploadResult.publicId,
    });
  } catch (error) {
    console.error("POST /api/upload/cover error:", error.message);
    return NextResponse.json(
      { success: false, message: "Image upload failed" },
      { status: 500 }
    );
  }
}
