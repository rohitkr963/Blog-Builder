# Blog Builder Platform

A modern, full-stack multi-user blog publishing platform built with Next.js App Router, Tailwind CSS, MongoDB, Mongoose, JWT authentication with HTTP-only cookies, TipTap rich text editing, and Cloudinary cover image storage.

---

## Overview

The Blog Builder Platform is designed to support a multi-role content team (`ADMIN` and `EMPLOYEE` accounts) as well as public readers.

- **Employees** can write, edit, draft, and publish rich-text articles with cover images, categories, and tags.
- **Admins** have platform-wide oversight to manage employee accounts, edit or unpublish any blog post, view overall platform readership statistics, and configure platform taxonomy (categories and tags).
- **Public Readers** can browse published articles, filter by category/tag, perform full-text search, and read responsive blog posts.

---

## Features

### Admin Capabilities
- **Employee Account Management**: Create and remove employee accounts.
- **Blog Oversight & Moderation**: View all platform blogs, edit any blog post, and unpublish any published post to instantly revert it to draft status.
- **Taxonomy Management**: Create and delete platform-wide Categories and Tags with deletion dependency protection (prevents deleting items in active use).
- **Platform Statistics**: Real-time counter cards showing Total Employees, Total Blogs, Total Views, and Taxonomy Items.

### Employee Capabilities
- **Blog Builder**: Create new articles with title, excerpt, category select, tag management, cover image, and TipTap rich text editor.
- **Rich Text Editor**: Supports Headings (H1/H2), Bold, Italic, Bullet Lists, Numbered Lists, Code Blocks, Hyperlinks, Inline Content Image uploads, and Image URLs.
- **Draft & Publish Workflow**: Save draft posts privately or publish posts for public viewing.
- **Cover Image Uploads**: Directly upload cover image files stored securely via Cloudinary.
- **Ownership Security**: Employees can view, edit, or delete only their own blog posts.

### Public Site Capabilities
- **Responsive Homepage**: Hero banner, search bar, category dropdown, tag pills, and clean 3-column card grid.
- **Individual Article Pages**: Clean typography layout with cover image, category badge, author details, calculated reading time, published date, view counter, and rendered HTML body.
- **Public Filters & Search**: Search across title, excerpt, and content, combined with category and tag filters.
- **Public Account Signup**: Allows visitors to register as an Employee (`role = "EMPLOYEE"` strictly enforced).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, JavaScript `.js`/`.jsx`)
- **Styling**: Tailwind CSS
- **Database**: MongoDB (Local Connection via Mongoose ODM)
- **Authentication**: JWT (`jsonwebtoken`) delivered via HTTP-Only Cookies + Password hashing via `bcryptjs`
- **Rich Text Editor**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`)
- **Image Storage**: Cloudinary (via `cloudinary` SDK and Route Handler uploads)

---

## Why This Stack

- **Next.js App Router**: Provides unified server-side API Route Handlers and client components without requiring a separate Express server.
- **JavaScript (.js/.jsx)**: Adheres strictly to project guidelines prohibiting TypeScript.
- **MongoDB + Mongoose**: Schema flexibility for blog documents with populated references to User accounts.
- **JWT in HTTP-Only Cookies**: Protects auth tokens from XSS attacks while eliminating manual client-side token storage.
- **TipTap**: Clean, extensible headless WYSIWYG editor framework.
- **Cloudinary**: Cloud-based media management for cover image and content image storage.

---

## Environment Variables

Create a `.env.local` file in the project root with the following keys:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/blog-builder

# JWT Secret Key
JWT_SECRET=your_super_secret_jwt_key_here

# Cloudinary Credentials (Optional for local testing if offline)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional email delivery for password reset and email verification
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=BlogCraft <noreply@example.com>
REQUIRE_EMAIL_VERIFICATION=false
```

*Note: Never commit real production secrets into source control.*

---

## Local Setup

1. **Clone & Install Dependencies:**
   ```bash
   git clone <repository-url>
   cd blog-builder
   npm install
   ```

2. **Start Local MongoDB:**
   Ensure MongoDB is running locally on port 27017:
   ```bash
   mongodb://127.0.0.1:27017/blog-builder
   ```

3. **Create the First Admin:**
   Run this once after MongoDB is available. The password is entered without terminal echo, and the command refuses to create another Admin if one already exists.
   ```bash
   npm run bootstrap:admin
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Lint, Build & Smoke Test:**
   ```bash
   npm run lint
   npm run build
   npm run test:e2e
   ```
   The smoke test requires MongoDB and a successful build. It starts a temporary production server, exercises signup/login, role restrictions, draft/publish visibility, deletion, and logout, then removes its temporary database records.

## Admin Bootstrap

Public signup always creates an `EMPLOYEE`; it cannot assign the Admin role. Create the initial Admin with `npm run bootstrap:admin`, which checks for an existing Admin and prompts for account details in the terminal. Keep `.env.local` private and do not run the bootstrap command again after an Admin exists.

## Deploy on Render

This repository includes a `render.yaml` Blueprint for a Node web service. In Render, choose **New > Blueprint**, connect the repository, and select this file. Render will install dependencies with `npm ci`, build with `npm run build`, start with `npm run start`, and monitor `/api/health`.

Set these values in the Render Environment tab (the Blueprint marks them as secret inputs):

- `MONGODB_URI`: a MongoDB Atlas connection string. Add Render's outbound IP access or use the Atlas network access policy required by your deployment.
- `JWT_SECRET`: a new random production secret, different from local development.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`: production Cloudinary credentials.

After the first deploy, open the Render service Shell and run `node scripts/bootstrap-admin.js` to create the first Admin. The Render Shell already supplies the environment variables, so do not use the local `npm run bootstrap:admin` command there.

Never upload `.env.local` or copy its existing credentials into Render. Rotate any credentials that have been exposed outside the secret manager before going live.

---

## Project Structure

```
blog-builder/
├── src/
│   ├── app/
│   │   ├── admin/             # Admin Dashboard & Admin Blog Editor pages
│   │   ├── api/               # Next.js App Router Route Handlers
│   │   │   ├── admin/         # Admin endpoints (employees, blogs, categories, tags)
│   │   │   ├── auth/          # Authentication endpoints (login, signup, logout)
│   │   │   ├── blogs/         # Authenticated Employee blog CRUD
│   │   │   ├── public/        # Public endpoints (published blogs, categories, tags)
│   │   │   └── upload/        # Cloudinary image upload route
│   │   ├── blog/[slug]/       # Public individual blog detail page
│   │   ├── employee/          # Employee Dashboard & Blog Builder forms
│   │   ├── login/             # Login page
│   │   ├── signup/            # Public Signup page
│   │   ├── layout.js          # Root layout with Tailwind fonts
│   │   └── page.js            # Public Homepage
│   ├── components/            # Reusable UI components (RichTextEditor, BlogCard)
│   ├── lib/                   # Core helpers (db.js, auth.js, slug.js, cloudinary.js)
│   └── models/                # Mongoose Models (User.js, Blog.js, Category.js, Tag.js)
├── .env.local                 # Environment variables
├── package.json
└── README.md
```

---

## Authentication & Security Architecture

- **JWT Tokens**: Signed on login (`signToken`) with 7-day expiration containing the user `id`.
- **HTTP-Only Cookies**: Set with `httpOnly: true`, `sameSite: "lax"`, and `path: "/"`.
- **Password Protection**: Plaintext passwords are NEVER stored. All passwords are hashed using `bcryptjs` (salt rounds: 10).
- **Public Signup Role Enforcement**: Public signup (`/api/auth/signup`) strictly forces `role = "EMPLOYEE"`. Any client payload attempting to specify `role: "ADMIN"` is ignored.
- **Server-Side Authorization Source of Truth**: APIs utilize `requireAuth()`, `requireEmployee()`, and `requireAdmin()`. Role data from client bodies or local storage is never trusted.
- **Draft Isolation**: Public APIs filter `status: "PUBLISHED"`. Draft posts return `404 Not Found` for unauthenticated or non-owner requests.

---

## API Overview

| Group | Endpoint | Method | Access | Description |
|---|---|---|---|---|
| **Auth** | `/api/auth/signup` | POST | Public | Create new Employee account |
| **Auth** | `/api/auth/login` | POST | Public | Authenticate & issue HTTP-only cookie |
| **Auth** | `/api/auth/logout` | POST | Public | Clear auth token cookie |
| **Public**| `/api/public/blogs` | GET | Public | Fetch published blogs with search/category/tag filters |
| **Public**| `/api/public/blogs/[slug]` | GET | Public | Fetch published blog details & increment view count |
| **Public**| `/api/public/categories` | GET | Public | Fetch available categories |
| **Public**| `/api/public/tags` | GET | Public | Fetch available tags |
| **Employee**| `/api/blogs` | GET/POST | Auth | List own blogs / Create new blog |
| **Employee**| `/api/blogs/[id]` | GET/PUT/DELETE | Auth Owner | Read/Update/Delete own blog post |
| **Employee**| `/api/upload/cover` | POST | Auth | Upload image file to Cloudinary |
| **Admin** | `/api/admin/employees` | GET/POST | Admin | List employees with blog counts / Add employee |
| **Admin** | `/api/admin/employees/[id]` | DELETE | Admin | Remove employee account (checks blog dependencies) |
| **Admin** | `/api/admin/blogs` | GET | Admin | List all platform blogs |
| **Admin** | `/api/admin/blogs/[id]` | GET/PUT/PATCH | Admin | Edit any blog / Unpublish blog (status -> DRAFT) |
| **Admin** | `/api/admin/categories` | GET/POST | Admin | List / Create categories |
| **Admin** | `/api/admin/categories/[id]` | DELETE | Admin | Delete category (checks blog usage dependency) |
| **Admin** | `/api/admin/tags` | GET/POST | Admin | List / Create tags |
| **Admin** | `/api/admin/tags/[id]` | DELETE | Admin | Delete tag (checks blog usage dependency) |

---

## Features Completed

- [x] Next.js App Router + JavaScript (.js/.jsx) + Tailwind CSS
- [x] Local MongoDB + Mongoose integration with hot-reload safe models
- [x] JWT authentication with HTTP-only cookies and bcryptjs hashing
- [x] Role-Based Access Control (`ADMIN` vs `EMPLOYEE`)
- [x] Server-enforced Public Signup (`role = "EMPLOYEE"`)
- [x] Admin Employee Management (Add, Remove, List with Blog counts)
- [x] Admin Platform Oversight (View all blogs, Edit any blog, Unpublish post)
- [x] Admin Taxonomy Management (Categories & Tags with 409 deletion guards)
- [x] Admin Dashboard Overview Statistics (Employees, Blogs, Total Views, Taxonomy)
- [x] Employee Blog Builder (Create, Edit, Save Draft, Publish)
- [x] Employee Ownership Guard (403 when attempting to access/modify another's post)
- [x] TipTap Rich Text Editor (H1/H2, Bold, Italic, Lists, Code, Links, Inline Content Image Uploads)
- [x] Cloudinary Cover Image Upload API integration
- [x] Public Homepage with Hero, Card Grid, Search, Category Filter, and Tag Filter
- [x] Individual Article Reader page with view counter and reading time calculation
- [x] Fully Responsive Layout (375px mobile, 768px tablet, 1440px desktop)
- [x] Password reset flow with expiring tokens and optional Resend delivery
- [x] Optional email verification flow with expiring verification tokens
- [x] Admin comment moderation queue (approve, reject, delete)
- [x] Login, signup, password reset, and comment rate limiting
- [x] SEO metadata, Open Graph tags, sitemap, and robots policy
- [x] Production smoke test with temporary-user cleanup

---

## Limitations / Skipped Features

- **OAuth / Social Logins**: Not required by assignment.
- **Email delivery**: Configure Resend variables to deliver password reset and verification links; without them, links are logged server-side for local development.
- **Nested Categories / Tag Hierarchies**: Simple flat taxonomy used per requirement guidelines.
- **Complex Media Library Manager**: Direct Cloudinary file upload used per assignment instructions.
