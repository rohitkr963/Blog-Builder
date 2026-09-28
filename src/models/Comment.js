import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED"],
      default: "APPROVED",
    },
  },
  { timestamps: true }
);

commentSchema.index({ blog: 1, status: 1, createdAt: -1 });

const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);

export default Comment;