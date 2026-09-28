import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Blog from "@/models/Blog";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/admin/employees
 * Create a new Employee user account.
 * ADMIN ONLY.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { name, email, password } = body;
      const department = typeof body.department === "string" ? body.department.trim() : "";

    // 1. Input Presence Validation
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required." },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Password Length Validation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (department.length > 80) {
      return NextResponse.json(
        { success: false, message: "Department must be 80 characters or fewer." },
        { status: 400 }
      );
    }

    await connectDB();

    // 3. Duplicate Email Check
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Employee with this email already exists." },
        { status: 409 }
      );
    }

    // 4. Password Hashing (bcryptjs)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create Employee Document (Role is strictly forced to EMPLOYEE)
    const newEmployee = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "EMPLOYEE",
      department,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully.",
        employee: {
          id: newEmployee._id.toString(),
          name: newEmployee.name,
          email: newEmployee.email,
          role: newEmployee.role,
          department: newEmployee.department,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/employees error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to create employee." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/employees
 * Fetch all Employee accounts with their blog counts.
 * ADMIN ONLY.
 */
export async function GET() {
  try {
    const { user, errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    await connectDB();

    // Fetch all users with role = EMPLOYEE
    const employees = await User.find({ role: "EMPLOYEE" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate blog count for each employee
    const employeesWithBlogCounts = await Promise.all(
      employees.map(async (emp) => {
        const blogCount = await Blog.countDocuments({ author: emp._id });
        return {
          id: emp._id.toString(),
          name: emp.name,
          department: emp.department || "",
          email: emp.email,
          role: emp.role,
          blogCount,
          createdAt: emp.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: employeesWithBlogCounts.length,
      employees: employeesWithBlogCounts,
    });
  } catch (error) {
    console.error("GET /api/admin/employees error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch employees." },
      { status: 500 }
    );
  }
}
