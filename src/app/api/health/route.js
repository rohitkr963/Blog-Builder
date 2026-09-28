import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

/**
 * GET /api/health
 *
 * A development utility route to verify the MongoDB connection is working.
 * Returns database connection status.
 *
 * This is NOT a security-sensitive endpoint — it reveals no data,
 * only connection status. It can be removed before final deployment.
 */
export async function GET() {
  try {
    // Attempt to connect to MongoDB
    await connectDB();

    // mongoose.connection.readyState values:
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    return NextResponse.json({
      success: true,
      database: stateMap[state] || "unknown",
      message: "Health check passed",
    });
  } catch (error) {
    // Return a 500 error if connection fails
    // We log the real error on server, but only send a safe message to client
    return NextResponse.json(
      {
        success: false,
        database: "disconnected",
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
