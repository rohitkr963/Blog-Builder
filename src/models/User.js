import mongoose from "mongoose";

// ============================================================
// USER SCHEMA
// ============================================================
// Schema = the blueprint/recipe for every User document.
// It defines what fields exist, their types, and their rules.
// ============================================================

const userSchema = new mongoose.Schema(
  {
    // ---------------------------------------------------------
    // name
    // The display name of the user (e.g. "Rohit Sharma")
    // trim: true removes leading/trailing whitespace automatically
    // ---------------------------------------------------------
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // ---------------------------------------------------------
    // email
    // Used as the unique login identifier.
    // lowercase: true ensures "Rohit@example.com" and
    // "rohit@example.com" are treated as the same email.
    // unique: true creates a MongoDB index — only one document
    // can have any given email value.
    // ---------------------------------------------------------
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },

    // ---------------------------------------------------------
    // password
    // Stored as a hashed string (bcrypt will handle hashing
    // in Phase 5/6). We NEVER store plain-text passwords.
    // The model itself has no hashing logic — that belongs
    // to the authentication layer.
    // ---------------------------------------------------------
    password: {
      type: String,
      required: [true, "Password is required"],
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ---------------------------------------------------------
    // role
    // Determines what the user can do in the application.
    // enum restricts the value to only "ADMIN" or "EMPLOYEE".
    // Any other value (e.g. "SUPERUSER") will cause a
    // Mongoose validation error before it reaches the DB.
    // default: "EMPLOYEE" means new users are employees
    // unless explicitly set as ADMIN.
    // ---------------------------------------------------------
    role: {
      type: String,
      enum: {
        values: ["ADMIN", "EMPLOYEE"],
        message: "Role must be either ADMIN or EMPLOYEE",
      },
      default: "EMPLOYEE",
    },
  },

  // ============================================================
  // SCHEMA OPTIONS
  // timestamps: true tells Mongoose to automatically add and
  // manage two fields on every document:
  //   createdAt — set once when the document is first created
  //   updatedAt — updated every time the document is saved
  // We never have to set these manually.
  // ============================================================
  {
    timestamps: true,
  }
);

    // department
    // Optional department field for employee records.
    // ---------------------------------------------------------
// ============================================================
// MODEL EXPORT — The Hot Reload Safety Pattern
// ============================================================
// In Next.js development, the server hot-reloads when you
// save a file. If we wrote just:
//   export default mongoose.model("User", userSchema)
// ...then on every hot reload, Mongoose would try to register
// the "User" model again and throw:
//   "Cannot overwrite `User` model once compiled."
//
// The fix:
//   mongoose.models.User   → use existing model if it exists
//   || mongoose.model(...)  → create it only if it doesn't
//
// This is a standard pattern in ALL Next.js + Mongoose apps.
// ============================================================

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Keep newly added profile fields available when Next.js hot reload reuses
// a previously compiled Mongoose model during local development.
if (!User.schema.path("bio") || !User.schema.path("profilePhoto")) {
  User.schema.add({
    bio: { type: String, trim: true, default: "", maxlength: 500 },
    profilePhoto: { type: String, trim: true, default: "" },
  });
}

export default User;
