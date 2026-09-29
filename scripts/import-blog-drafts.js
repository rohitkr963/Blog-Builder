import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { marked } from "marked";
import { connectDB } from "../src/lib/db.js";
import { uploadCoverImage } from "../src/lib/cloudinary.js";
import { sanitizeBlogContent } from "../src/lib/sanitize-blog-content.js";
import Blog from "../src/models/Blog.js";
import User from "../src/models/User.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftFile = path.join(projectRoot, "blog-drafts.md");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseDrafts(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];
  if (headings.length === 0) throw new Error("No numbered draft headings were found.");

  const drafts = headings.map((heading, index) => {
    const sectionStart = heading.index + heading[0].length;
    const sectionEnd = headings[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(sectionStart, sectionEnd);
    const coverImage = section.match(/^\*\*Cover image:\*\*\s*(.+)$/m)?.[1]?.trim();
    const category = section.match(/^\*\*Category:\*\*\s*(.+)$/m)?.[1]?.trim();
    const rawTags = section.match(/^\*\*Tags:\*\*\s*(.+)$/m)?.[1] ?? "";
    const excerpt = section.match(/^\*\*Excerpt:\*\*\s*(.+)$/m)?.[1]?.trim();
    const content = section
      .replace(/^\*\*(?:Cover image|Category|Tags|Excerpt):\*\*.*(?:\r?\n|$)/gm, "")
      .replace(/(?:\r?\n)?\s*---\s*$/, "")
      .trim();

    if (!heading[2]?.trim() || !coverImage || !category || !excerpt || !content) {
      throw new Error(`Draft ${heading[1]} is missing a title, cover image, category, excerpt, or body.`);
    }

    let imageUrl;
    try {
      imageUrl = new URL(coverImage);
    } catch {
      throw new Error(`Draft ${heading[1]} has an invalid cover image URL.`);
    }
    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "images.unsplash.com") {
      throw new Error(`Draft ${heading[1]} cover images must use HTTPS from images.unsplash.com.`);
    }

    return {
      title: heading[2].trim(),
      coverImage,
      category,
      tags: rawTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      excerpt,
      content: sanitizeBlogContent(marked.parse(content)),
    };
  });

  const uniqueTitles = new Set(drafts.map((draft) => draft.title.toLowerCase()));
  if (uniqueTitles.size !== drafts.length) throw new Error("The draft file contains duplicate titles.");
  return drafts;
}

function assertCloudinaryConfigured() {
  const hasCredentials =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== "your_cloudinary_api_secret_here";

  if (!hasCredentials) {
    throw new Error("Cloudinary credentials are required to import draft cover images.");
  }
}

async function uploadDraftCoverImage(imageUrl) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Could not download cover image (${response.status}).`);

  const mimeType = response.headers.get("content-type")?.split(";")[0].toLowerCase();
  const contentLength = Number(response.headers.get("content-length"));
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) throw new Error(`Unsupported cover image type: ${mimeType || "unknown"}.`);
  if (contentLength > MAX_IMAGE_SIZE) throw new Error("Cover image exceeds the 5 MB limit.");

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  if (imageBuffer.length > MAX_IMAGE_SIZE) throw new Error("Cover image exceeds the 5 MB limit.");

  return uploadCoverImage(imageBuffer, mimeType);
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled-blog";
}

async function createUniqueSlug(title) {
  const baseSlug = slugify(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (await Blog.exists({ slug: candidate })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function main() {
  const authorArgument = process.argv.indexOf("--author");
  const authorEmail = authorArgument >= 0 ? process.argv[authorArgument + 1]?.trim().toLowerCase() : "";
  const applyChanges = process.argv.includes("--apply");

  if (!authorEmail || !authorEmail.includes("@")) {
    throw new Error("Usage: npm run import:drafts -- --author email@example.com [--apply]");
  }

  const markdown = await readFile(draftFile, "utf8");
  const drafts = parseDrafts(markdown);

  await connectDB();
  const author = await User.findOne({ email: authorEmail }).select("_id email role").lean();
  if (!author) throw new Error(`No account exists for ${authorEmail}; no drafts were imported.`);

  const existingBlogs = await Blog.find({
    author: author._id,
    title: { $in: drafts.map((draft) => draft.title) },
  }).select("title coverImage").lean();
  const existingByTitle = new Map(existingBlogs.map((blog) => [blog.title.toLowerCase(), blog]));
  const newDrafts = drafts.filter((draft) => !existingByTitle.has(draft.title.toLowerCase()));
  const draftsMissingCover = drafts.filter((draft) => {
    const existing = existingByTitle.get(draft.title.toLowerCase());
    return existing && !existing.coverImage;
  });
  const skippedCount = existingBlogs.length - draftsMissingCover.length;

  console.log(`Account: ${author.email} (${author.role})`);
  console.log(`Drafts in file: ${drafts.length}; already present: ${skippedCount}; to add: ${newDrafts.length}`);
  console.log(`Existing drafts needing cover images: ${draftsMissingCover.length}`);

  if (!applyChanges) {
    console.log("Dry run only. Add --apply to save these records as drafts.");
    return;
  }

  if (newDrafts.length || draftsMissingCover.length) assertCloudinaryConfigured();

  for (const draft of newDrafts) {
    const slug = await createUniqueSlug(draft.title);
    const uploadedImage = await uploadDraftCoverImage(draft.coverImage);
    await Blog.create({
      ...draft,
      slug,
      coverImage: uploadedImage.url,
      author: author._id,
      status: "DRAFT",
      publishedAt: null,
    });
  }

  for (const draft of draftsMissingCover) {
    const uploadedImage = await uploadDraftCoverImage(draft.coverImage);
    await Blog.updateOne(
      { author: author._id, title: draft.title, $or: [{ coverImage: "" }, { coverImage: null }] },
      { $set: { coverImage: uploadedImage.url } }
    );
  }

  console.log(`Imported ${newDrafts.length} drafts and added ${draftsMissingCover.length} cover images. They remain unpublished.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });