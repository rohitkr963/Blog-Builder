import mongoose from "mongoose";

// ============================================================
// BLOG SCHEMA
// ============================================================
// Schema defining article structure, metadata, ownership,
// state, and publication attributes for the Blog Builder Platform.
// ============================================================

const blogSchema = new mongoose.Schema(
  {
    // ---------------------------------------------------------
    // title: Main headline of the blog post
    // ---------------------------------------------------------
    title: {
      type: String,
      required: function () { return this.status === "PUBLISHED"; },
      trim: true,
      default: "",
    },

    // ---------------------------------------------------------
    // slug: URL-friendly identifier derived from title
    // Example: "the-future-of-data-analytics"
    // Indexed for fast lookup on GET /blog/[slug]
    // ---------------------------------------------------------
    slug: {
      type: String,
      required: [true, "Blog slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // ---------------------------------------------------------
    // content: HTML / rich text body output from TipTap editor
    // ---------------------------------------------------------
    content: {
      type: String,
      required: function () { return this.status === "PUBLISHED"; },
      default: "",
    },

    // ---------------------------------------------------------
    // excerpt: Short introductory summary for blog cards
    // ---------------------------------------------------------
    excerpt: {
      type: String,
      trim: true,
      default: "",
    },

    // ---------------------------------------------------------
    // coverImage: Remote URL string of uploaded image (Cloudinary)
    // ---------------------------------------------------------
    coverImage: {
      type: String,
      default: "",
    },

    // ---------------------------------------------------------
    // author: Reference to User document (Employee or Admin)
    // Indexed for fast author-specific queries (Employee dashboard)
    // ---------------------------------------------------------
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Blog author is required"],
      index: true,
    },

    // ---------------------------------------------------------
    // category: Primary category classification (e.g., "Data & Analytics")
    // Indexed for category filter queries
    // ---------------------------------------------------------
    category: {
      type: String,
      required: function () { return this.status === "PUBLISHED"; },
      trim: true,
      default: "",
      index: true,
    },

    // ---------------------------------------------------------
    // tags: Array of tag strings (e.g., ["analytics", "business intelligence"])
    // ---------------------------------------------------------
    tags: {
      type: [String],
      default: [],
    },

    // ---------------------------------------------------------
    // status: Article publication state ("DRAFT" vs "PUBLISHED")
    // Indexed for filtering public vs dashboard viewable blogs
    // ---------------------------------------------------------
    status: {
      type: String,
      enum: {
        values: ["DRAFT", "PUBLISHED"],
        message: "Status must be either DRAFT or PUBLISHED",
      },
      default: "DRAFT",
      index: true,
    },

    // ---------------------------------------------------------
    // publishedAt: Timestamp of when article was published
    // Set to null while in DRAFT mode; populated upon publication
    // ---------------------------------------------------------
    publishedAt: {
      type: Date,
      default: null,
    },

    // ---------------------------------------------------------
    // views: Total view count for statistics tracking
    // ---------------------------------------------------------
    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },
  },

  // Automatically manages createdAt and updatedAt timestamps
  {
    timestamps: true,
  }
);

// ============================================================
// MODEL EXPORT — Next.js Development Hot Reload Safety
// ============================================================
const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

export default Blog;
