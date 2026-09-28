const CLOUDINARY_HOST = "res.cloudinary.com";
const TRANSFORMATION_SEGMENT = /^(?:a|b|c|dpr|e|f|fl|g|h|if|l|o|p|q|r|t|u|w|x|y|z)_/i;

export function optimizeCloudinaryUrl(source, maxWidth = 1600) {
  if (typeof source !== "string" || !source || source.startsWith("data:")) return source;

  const width = Number.isSafeInteger(maxWidth) && maxWidth > 0 ? maxWidth : 1600;

  try {
    const url = new URL(source);
    if (url.hostname !== CLOUDINARY_HOST) return source;

    const segments = url.pathname.split("/");
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 0) return source;

    const nextSegment = segments[uploadIndex + 1] || "";
    const isTransformation = TRANSFORMATION_SEGMENT.test(nextSegment);
    const existingWidth = isTransformation
      ? Number(nextSegment.match(/(?:^|,)w_(\d+)/)?.[1])
      : 0;
    const deliveryWidth = existingWidth > 0 ? Math.min(existingWidth, width) : width;
    const transforms = ["c_limit", "f_auto", "q_auto", `w_${deliveryWidth}`];

    if (isTransformation) {
      const preservedTransforms = nextSegment
        .split(",")
        .filter((value) => !/^(?:c|f|q|w)_/.test(value));
      segments[uploadIndex + 1] = [...transforms, ...preservedTransforms].join(",");
    } else {
      segments.splice(uploadIndex + 1, 0, transforms.join(","));
    }

    url.pathname = segments.join("/");
    return url.toString();
  } catch {
    return source;
  }
}

export function optimizeInlineImageHtml(html) {
  if (typeof html !== "string" || typeof DOMParser === "undefined") return html || "";

  const document = new DOMParser().parseFromString(html, "text/html");
  document.body.querySelectorAll("img[src]").forEach((image) => {
    image.src = optimizeCloudinaryUrl(image.getAttribute("src"), 1200);
    image.loading = "lazy";
    image.decoding = "async";
  });

  return document.body.innerHTML;
}