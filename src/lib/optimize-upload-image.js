const MAX_DIMENSION = 1600;
const OPTIMIZABLE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function optimizeUploadImage(file) {
  if (!OPTIMIZABLE_TYPES.has(file.type.toLowerCase())) return file;

  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_DIMENSION / bitmap.width, MAX_DIMENSION / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));

    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    const filename = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${filename}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}