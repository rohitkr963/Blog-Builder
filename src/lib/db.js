import mongoose from "mongoose";

// We read the connection string from environment variable
// process.env gives us access to variables defined in .env.local
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * WHY CACHING?
 *
 * In development, Next.js uses "hot reload" — it re-executes module code
 * every time you save a file. Without caching, this would create a NEW
 * MongoDB connection on every file save, quickly exhausting the connection limit.
 *
 * We store the connection on the `global` object because it persists
 * across hot reloads in development mode.
 *
 * In production, each serverless function invocation is separate,
 * so the cache prevents reconnecting on every request within the same instance.
 */

// Use global to preserve connection across Next.js hot reloads in development
let cached = global.mongoose;

if (!cached) {
  // First time: initialize the cache object on global
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * connectDB — Call this function at the top of any Route Handler
 * that needs database access.
 *
 * It returns the existing connection if already connected,
 * or creates a new one and caches it for reuse.
 */
export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }

  // If we already have an active connection, return it immediately
  if (cached.conn) {
    return cached.conn;
  }

  // If no ongoing connection attempt, start one
  if (!cached.promise) {
    const options = {
      // bufferCommands: false means Mongoose won't buffer commands
      // while the connection is being established — we want fast failures
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, options)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset the promise so the next call tries again
        cached.promise = null;
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
      });
  }

  // Wait for the connection promise to resolve
  cached.conn = await cached.promise;
  return cached.conn;
}
