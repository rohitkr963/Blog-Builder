"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/blog/Pagination";
import ThemeToggle from "@/components/layout/ThemeToggle";

const EMPLOYEES_PER_PAGE = 5;
const BLOGS_PER_PAGE = 5;

export default function AdminDashboardPage() {
  const router = useRouter();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState("employees"); // "employees" | "blogs" | "taxonomy"

  // Employee State
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("");
  const [employeePage, setEmployeePage] = useState(1);

  // Blog State
  const [adminBlogs, setAdminBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [unpublishingId, setUnpublishingId] = useState(null);
  const [deletingBlogId, setDeletingBlogId] = useState(null);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogStatusFilter, setBlogStatusFilter] = useState("");
  const [blogCategoryFilter, setBlogCategoryFilter] = useState("");
  const [blogPage, setBlogPage] = useState(1);

  // Taxonomy State (Categories & Tags)
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryAdding, setCategoryAdding] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagNameInput, setTagNameInput] = useState("");
  const [tagAdding, setTagAdding] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState(null);

  // Global Messages
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add Employee Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete Action State
  const [deletingId, setDeletingId] = useState(null);

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      setError("");

      const res = await fetch("/api/admin/employees");
      const data = await res.json();

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load employees");
      }

      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchAdminBlogs = async () => {
    try {
      setBlogsLoading(true);
      const res = await fetch("/api/admin/blogs");
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminBlogs(data.blogs || []);
      }
    } catch (err) {
      console.error("Failed to load admin blogs:", err);
    } finally {
      setBlogsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (res.ok && data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      setTagsLoading(true);
      const res = await fetch("/api/admin/tags");
      const data = await res.json();
      if (res.ok && data.success) {
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setEmployeesLoading(true);
        setBlogsLoading(true);
        setCategoriesLoading(true);
        setTagsLoading(true);
        setError("");

        const [empRes, blogRes, catRes, tagRes] = await Promise.all([
          fetch("/api/admin/employees"),
          fetch("/api/admin/blogs"),
          fetch("/api/admin/categories"),
          fetch("/api/admin/tags"),
        ]);

        if (!isMounted) return;

        if (empRes.status === 401) {
          router.push("/login");
          return;
        }

        if (empRes.status === 403) {
          setAccessDenied(true);
          return;
        }

        const empData = await empRes.json();
        const blogData = await blogRes.json();
        const catData = await catRes.json();
        const tagData = await tagRes.json();

        if (!isMounted) return;

        if (empData.success) setEmployees(empData.employees || []);
        if (blogData.success) setAdminBlogs(blogData.blogs || []);
        if (catData.success) setCategories(catData.categories || []);
        if (tagData.success) setTags(tagData.tags || []);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) {
          setEmployeesLoading(false);
          setBlogsLoading(false);
          setCategoriesLoading(false);
          setTagsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleAddInputChange = (e) => {
    setAddFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (addError) setAddError("");
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    setSuccessMsg("");

    try {
      if (!addFormData.name.trim()) throw new Error("Name is required");
      if (!addFormData.email.trim()) throw new Error("Email is required");
      if (!addFormData.password || addFormData.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addFormData.name.trim(),
          email: addFormData.email.trim().toLowerCase(),
          password: addFormData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create employee");
      }

      setSuccessMsg(`Employee "${data.employee.name}" created successfully.`);
      setAddFormData({ name: "", email: "", password: "" });
      setShowAddModal(false);

      await fetchEmployees();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${employeeName}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(employeeId);
      setSuccessMsg("");

      const res = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 409) {
        alert(`Cannot delete employee: ${data.message}`);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete employee");
      }

      setSuccessMsg(`Employee "${employeeName}" deleted successfully.`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnpublishBlog = async (blogId, blogTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to unpublish "${blogTitle}"? It will immediately disappear from the public website.`
    );

    if (!confirmed) return;

    try {
      setUnpublishingId(blogId);
      setSuccessMsg("");

      const res = await fetch(`/api/admin/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to unpublish blog");
      }

      setSuccessMsg(`Blog "${blogTitle}" unpublished successfully.`);

      setAdminBlogs((prev) =>
        prev.map((b) =>
          b.id === blogId ? { ...b, status: "DRAFT", publishedAt: null } : b
        )
      );
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUnpublishingId(null);
    }
  };

  const handleDeleteBlog = async (blogId, blogTitle) => {
    const confirmed = window.confirm(
      `Delete "${blogTitle}" permanently? Its comments and likes will also be removed.`
    );
    if (!confirmed) return;

    try {
      setDeletingBlogId(blogId);
      setError("");
      setSuccessMsg("");

      const response = await fetch(`/api/admin/blogs/${blogId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete blog.");
      }

      setAdminBlogs((current) => current.filter((blog) => (blog.id || blog._id) !== blogId));
      setSuccessMsg(`Blog "${blogTitle}" deleted successfully.`);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingBlogId(null);
    }
  };

  const availableRoles = [...new Set(employees.map((employee) => employee.role).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
  const availableDepartments = [...new Set(employees.map((employee) => employee.department?.trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
  const hasUnassignedDepartments = employees.some((employee) => !employee.department?.trim());
  const filteredEmployees = employees.filter((employee) => {
    const searchValue = employeeSearch.trim().toLowerCase();
    const matchesSearch = !searchValue || [employee.name, employee.email, employee.department]
      .some((value) => value?.toLowerCase().includes(searchValue));
    const matchesRole = !employeeRoleFilter || employee.role === employeeRoleFilter;
    const matchesDepartment = !employeeDepartmentFilter || (employeeDepartmentFilter === "__unassigned__"
      ? !employee.department?.trim()
      : employee.department === employeeDepartmentFilter);
    return matchesSearch && matchesRole && matchesDepartment;
  });
  const employeeTotalPages = Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE);
  const currentEmployeePage = Math.min(employeePage, Math.max(employeeTotalPages, 1));
  const visibleEmployees = filteredEmployees.slice(
    (currentEmployeePage - 1) * EMPLOYEES_PER_PAGE,
    currentEmployeePage * EMPLOYEES_PER_PAGE
  );
  const availableBlogCategories = [...new Set(adminBlogs.map((blog) => blog.category).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
  const filteredAdminBlogs = adminBlogs.filter((blog) => {
    const searchValue = blogSearch.trim().toLowerCase();
    const searchableFields = [blog.title, blog.author?.name, blog.author?.email, blog.category];
    const matchesSearch = !searchValue || searchableFields.some((value) => value?.toLowerCase().includes(searchValue));
    const matchesStatus = !blogStatusFilter || blog.status === blogStatusFilter;
    const matchesCategory = !blogCategoryFilter || blog.category === blogCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const blogTotalPages = Math.ceil(filteredAdminBlogs.length / BLOGS_PER_PAGE);
  const currentBlogPage = Math.min(blogPage, Math.max(blogTotalPages, 1));
  const visibleAdminBlogs = filteredAdminBlogs.slice(
    (currentBlogPage - 1) * BLOGS_PER_PAGE,
    currentBlogPage * BLOGS_PER_PAGE
  );

  // Category Handlers
  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    setCategoryAdding(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryNameInput.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        throw new Error(data.message || "Category name or slug already exists.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create category");
      }

      setSuccessMsg(`Category "${data.category.name}" created successfully.`);
      setCategoryNameInput("");
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setCategoryAdding(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete category "${catName}"?`
    );
    if (!confirmed) return;

    setDeletingCategoryId(catId);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(
          data.message ||
            "Cannot delete category because it is being used by blogs."
        );
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete category");
      }

      setSuccessMsg(`Category "${catName}" deleted successfully.`);
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Tag Handlers
  const handleAddTagSubmit = async (e) => {
    e.preventDefault();
    if (!tagNameInput.trim()) return;

    setTagAdding(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagNameInput.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        throw new Error(data.message || "Tag name or slug already exists.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create tag");
      }

      setSuccessMsg(`Tag "${data.tag.name}" created successfully.`);
      setTagNameInput("");
      await fetchTags();
    } catch (err) {
      setError(err.message);
    } finally {
      setTagAdding(false);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete tag "${tagName}"?`
    );
    if (!confirmed) return;

    setDeletingTagId(tagId);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(
          data.message || "Cannot delete tag because it is being used by blogs."
        );
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete tag");
      }

      setSuccessMsg(`Tag "${tagName}" deleted successfully.`);
      await fetchTags();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingTagId(null);
    }
  };

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            🚫
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-600">
            You are signed in, but Admin permissions are required to access this dashboard.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/employee/dashboard"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Employee Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 uppercase tracking-wide">
                Admin Panel
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage employees, review platform content, and configure taxonomy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setAddError("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
            >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Employee
            </button>
          </div>
        </div>

        {/* Admin Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Employees</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              👥
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Blogs</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{adminBlogs.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              📝
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Views</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {adminBlogs.reduce((acc, b) => acc + (b.views || 0), 0).toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              👁️
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Taxonomy Items</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {categories.length} <span className="text-xs font-normal text-gray-400">cats</span> / {tags.length} <span className="text-xs font-normal text-gray-400">tags</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              🏷️
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg("")}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-900 font-bold ml-4"
            >
              ×
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-6">
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "employees"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Employee Management ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab("blogs")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "blogs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Blog Management ({adminBlogs.length})
          </button>
          <button
            onClick={() => setActiveTab("taxonomy")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "taxonomy"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Categories & Tags
          </button>
        </div>

        {/* TAB 1: EMPLOYEE MANAGEMENT TABLE */}
        {activeTab === "employees" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Employee Accounts</h2>
                <p className="mt-1 text-xs text-gray-500">{filteredEmployees.length} of {employees.length} employee accounts</p>
              </div>
            </div>

            <div className="grid gap-3 border-b border-gray-200 bg-gray-50/50 p-4 lg:grid-cols-[minmax(220px,1fr)_170px_190px]">
              <label className="relative block">
                <span className="sr-only">Filter employees by name, email, or department</span>
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(event) => {
                    setEmployeeSearch(event.target.value);
                    setEmployeePage(1);
                  }}
                  placeholder="Filter by name, email, department..."
                  className="ui-input ui-search-input min-h-10 text-sm"
                />
              </label>
              <label>
                <span className="sr-only">Filter by role</span>
                <select value={employeeRoleFilter} onChange={(event) => { setEmployeeRoleFilter(event.target.value); setEmployeePage(1); }} className="ui-select min-h-10 text-sm">
                  <option value="">All roles</option>
                  {availableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by department</span>
                <select value={employeeDepartmentFilter} onChange={(event) => { setEmployeeDepartmentFilter(event.target.value); setEmployeePage(1); }} className="ui-select min-h-10 text-sm">
                  <option value="">All departments</option>
                  {availableDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                  {hasUnassignedDepartments && <option value="__unassigned__">Unassigned</option>}
                </select>
              </label>
            </div>

            {employeesLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                <p className="text-xs">Loading employees...</p>
              </div>
            ) : employees.length === 0 || filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-500 space-y-3">
                <p className="text-sm font-medium">{employees.length === 0 ? "No employee accounts yet." : "No employees match these filters."}</p>
                {employees.length === 0 ? (
                  <button type="button" onClick={() => setShowAddModal(true)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition">Add First Employee</button>
                ) : (
                  <button type="button" onClick={() => { setEmployeeSearch(""); setEmployeeRoleFilter(""); setEmployeeDepartmentFilter(""); setEmployeePage(1); }} className="text-sm font-semibold text-[var(--accent)] hover:underline">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Employee Name</th>
                      <th className="px-6 py-3.5">Email Address</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Total Blogs</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {visibleEmployees.map((emp) => {
                      const empId = emp.id || emp._id;
                      return (
                        <tr
                          key={empId}
                          className="hover:bg-gray-50/80 transition"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {emp.name}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                            {emp.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs">{emp.department || "Unassigned"}</td>
                          <td className="px-6 py-4 text-gray-600 font-semibold text-xs">
                            {emp.blogCount ?? 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              disabled={deletingId === empId}
                              onClick={() =>
                                handleDeleteEmployee(empId, emp.name)
                              }
                              className="text-red-600 hover:text-red-900 font-medium text-xs disabled:opacity-50 transition"
                            >
                              {deletingId === empId
                                ? "Deleting..."
                                : "Remove Account"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!employeesLoading && filteredEmployees.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
                <p className="text-xs text-gray-500">Showing {(currentEmployeePage - 1) * EMPLOYEES_PER_PAGE + 1}–{Math.min(currentEmployeePage * EMPLOYEES_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employee accounts</p>
                <Pagination currentPage={currentEmployeePage} totalPages={employeeTotalPages} onPageChange={setEmployeePage} />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BLOG MANAGEMENT TABLE */}
        {activeTab === "blogs" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Platform Blog Management</h2>
                <p className="mt-1 text-xs text-gray-500">{filteredAdminBlogs.length} of {adminBlogs.length} blog posts</p>
              </div>
              {(blogSearch || blogStatusFilter || blogCategoryFilter) && (
                <button type="button" onClick={() => { setBlogSearch(""); setBlogStatusFilter(""); setBlogCategoryFilter(""); setBlogPage(1); }} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid gap-3 border-b border-gray-200 bg-gray-50/50 p-4 lg:grid-cols-[minmax(240px,1fr)_180px_220px]">
              <label>
                <span className="sr-only">Search blogs by title, author, or email</span>
                <input type="search" value={blogSearch} onChange={(event) => { setBlogSearch(event.target.value); setBlogPage(1); }} placeholder="Search title, author, email..." className="ui-input min-h-10 text-sm" />
              </label>
              <label>
                <span className="sr-only">Filter blogs by status</span>
                <select value={blogStatusFilter} onChange={(event) => { setBlogStatusFilter(event.target.value); setBlogPage(1); }} className="ui-select min-h-10 text-sm">
                  <option value="">All statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter blogs by category</span>
                <select value={blogCategoryFilter} onChange={(event) => { setBlogCategoryFilter(event.target.value); setBlogPage(1); }} className="ui-select min-h-10 text-sm">
                  <option value="">All categories</option>
                  {availableBlogCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </div>

            {blogsLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                <p className="text-xs">Loading blog posts...</p>
              </div>
            ) : adminBlogs.length === 0 || filteredAdminBlogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">{adminBlogs.length === 0 ? "No blog posts found on the platform." : "No blog posts match these filters."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[21%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[9%]" />
                    <col className="w-[18%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3.5">Title</th>
                      <th className="px-4 py-3.5">Author</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Views</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {visibleAdminBlogs.map((blog) => {
                      const blogId = blog.id || blog._id;
                      const isPublished = blog.status === "PUBLISHED";

                      return (
                        <tr
                          key={blogId}
                          className="hover:bg-gray-50/80 transition"
                        >
                          <td className="px-4 py-4 font-medium text-gray-900 max-w-xs truncate">
                            {blog.title}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-700 font-medium">
                            {blog.author?.name || "Unknown Author"}
                            <span className="block text-gray-400 font-mono text-[10px]">
                              {blog.author?.email}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-600 text-xs">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">
                              {blog.category}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {isPublished ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-600 text-xs font-semibold">
                            {blog.views || 0}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <Link href={`/admin/blog/${blogId}/edit`} className="text-xs font-medium text-blue-600 hover:text-blue-900">Edit</Link>
                              {isPublished && (
                                <button type="button" disabled={unpublishingId === blogId || deletingBlogId === blogId} onClick={() => handleUnpublishBlog(blogId, blog.title)} className="text-xs font-medium text-amber-600 hover:text-amber-900 disabled:opacity-50">
                                  {unpublishingId === blogId ? "Working..." : "Unpublish"}
                                </button>
                              )}
                              <button type="button" disabled={deletingBlogId === blogId || unpublishingId === blogId} onClick={() => handleDeleteBlog(blogId, blog.title)} className="text-xs font-medium text-red-600 hover:text-red-900 disabled:opacity-50">
                                {deletingBlogId === blogId ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!blogsLoading && filteredAdminBlogs.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
                <p className="text-xs text-gray-500">Showing {(currentBlogPage - 1) * BLOGS_PER_PAGE + 1}–{Math.min(currentBlogPage * BLOGS_PER_PAGE, filteredAdminBlogs.length)} of {filteredAdminBlogs.length} blog posts</p>
                <Pagination currentPage={currentBlogPage} totalPages={blogTotalPages} onPageChange={setBlogPage} />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CATEGORIES & TAGS MANAGEMENT */}
        {activeTab === "taxonomy" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CATEGORY MANAGEMENT SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Category Management
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add or remove platform categories
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                  {categories.length} Categories
                </span>
              </div>

              {/* Add Category Form */}
              <form
                onSubmit={handleAddCategorySubmit}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  required
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="Category Name (e.g. Technology)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={categoryAdding}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {categoryAdding ? "Adding..." : "Add"}
                </button>
              </form>

              {/* Category List */}
              {categoriesLoading ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  Loading categories...
                </p>
              ) : categories.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  No categories created yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-80 overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          {cat.name}
                        </span>
                        <span className="block text-[11px] text-gray-400 font-mono">
                          slug: {cat.slug}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingCategoryId === cat.id}
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 font-medium"
                      >
                        {deletingCategoryId === cat.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAG MANAGEMENT SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Tag Management
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add or remove platform tags
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                  {tags.length} Tags
                </span>
              </div>

              {/* Add Tag Form */}
              <form
                onSubmit={handleAddTagSubmit}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  required
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  placeholder="Tag Name (e.g. Next.js)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={tagAdding}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {tagAdding ? "Adding..." : "Add"}
                </button>
              </form>

              {/* Tag List */}
              {tagsLoading ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  Loading tags...
                </p>
              ) : tags.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  No tags created yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-80 overflow-y-auto">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          {tag.name}
                        </span>
                        <span className="block text-[11px] text-gray-400 font-mono">
                          slug: {tag.slug}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingTagId === tag.id}
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 font-medium"
                      >
                        {deletingTagId === tag.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New Employee</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="add-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="add-name"
                  name="name"
                  type="text"
                  required
                  value={addFormData.name}
                  onChange={handleAddInputChange}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
                />
              </div>

              <div>
                <label
                  htmlFor="add-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address *
                </label>
                <input
                  id="add-email"
                  name="email"
                  type="email"
                  required
                  value={addFormData.email}
                  onChange={handleAddInputChange}
                  placeholder="rahul@analyticsliv.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
                />
              </div>

              <div>
                <label
                  htmlFor="add-password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password (min 6 chars) *
                </label>
                <input
                  id="add-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={addFormData.password}
                  onChange={handleAddInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
                >
                  {addLoading ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
