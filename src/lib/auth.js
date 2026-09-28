import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Sign a JWT token for a given user ID.
 * Payload contains only the minimum necessary identifier (userId).
 */
export function signToken(userId) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is missing.");
  }
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify a raw JWT token string.
 * Returns payload if valid, or null if invalid/expired.
 */
export function verifyToken(token) {
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Server-side authentication helper.
 * Reads the token from the HTTP-only cookie, verifies it,
 * connects to MongoDB, and returns the current User object without password.
 * Returns null if not authenticated or user not found.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return null;
    }

    await connectDB();
    const user = await User.findById(decoded.userId).select("-password").lean();

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      bio: user.bio || "",
      profilePhoto: user.profilePhoto || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("Authentication helper error:", error.message);
    return null;
  }
}

/**
 * Authorization Helper: Require user to be authenticated.
 * Returns { user, errorResponse }. If user is unauthenticated, errorResponse is a 401 NextResponse.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, message: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

/**
 * Authorization Helper: Require authenticated user to have a specific role or set of roles.
 * Returns { user, errorResponse }. Returns 401 if unauthenticated, 403 if forbidden.
 */
export async function requireRole(allowedRoles) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) {
    return { user: null, errorResponse };
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, message: "Access forbidden. Insufficient permissions." },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Authorization Helper: Shortcut for ADMIN role requirement.
 */
export async function requireAdmin() {
  return requireRole("ADMIN");
}

/**
 * Authorization Helper: Shortcut for EMPLOYEE role requirement.
 */
export async function requireEmployee() {
  return requireRole("EMPLOYEE");
}
