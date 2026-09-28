import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    readerId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

likeSchema.index({ blog: 1, readerId: 1 }, { unique: true });

const Like = mongoose.models.Like || mongoose.model("Like", likeSchema);

export default Like;