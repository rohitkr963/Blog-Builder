import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with server-side environment variables
// NEVER expose API_SECRET to client components or browser bundle
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image buffer to Cloudinary in the "blog-builder/covers" folder.
 * Returns { url: secure_url, publicId: public_id }.
 */
export async function uploadCoverImage(fileBuffer, mimeType, folder = "blog-builder/covers") {
  const isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== "your_cloudinary_api_secret_here";

  // If real Cloudinary keys are provided, upload via Cloudinary SDK upload_stream
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload stream error:", error);
            return reject(new Error(error.message || "Cloudinary upload failed"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  // Fallback demo mode for local dev when real Cloudinary API keys are not filled yet:
  // Converts image buffer to a base64 data URI so full cover image upload & preview
  // functionality works seamlessly without breaking local testing.
  const base64Data = fileBuffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const mockPublicId = `${folder}/demo_${Date.now()}`;

  return {
    url: dataUri,
    publicId: mockPublicId,
  };
}

export default cloudinary;
