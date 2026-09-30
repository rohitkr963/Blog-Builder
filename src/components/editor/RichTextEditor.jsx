"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { optimizeUploadImage } from "@/lib/optimize-upload-image";

export default function RichTextEditor({ content = "", onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4 border border-gray-200 shadow-sm",
        },
      }),
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none p-4 min-h-[250px] focus:outline-none text-gray-900 bg-white",
      },
    },
  });

  if (!editor) {
    return (
      <div className="w-full h-64 bg-gray-50 animate-pulse rounded-lg border border-gray-300 flex items-center justify-center text-gray-400 text-sm">
        Loading editor...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter destination URL:", previousUrl);

    if (url === null) {
      return; // Cancelled
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Add https:// prefix if user entered www. or domain without protocol
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !/^\//.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: formattedUrl })
      .run();
  };

  const handleInsertImageUrl = () => {
    const url = window.prompt("Enter image URL (or click Upload to select a file):");
    if (url && url.trim()) {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl) && !/^\//.test(formattedUrl) && !/^data:image\//.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor.chain().focus().setImage({ src: formattedUrl }).run();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size exceeds 5MB limit.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", await optimizeUploadImage(file));

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image");
      }

      editor.chain().focus().setImage({ src: data.url }).run();
    } catch (err) {
      alert(`Image upload error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-full border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2.5 py-1 rounded transition ${
            editor.isActive("heading", { level: 1 })
              ? "bg-blue-600 text-white font-bold"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Heading 1"
        >
          H1
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2.5 py-1 rounded transition ${
            editor.isActive("heading", { level: 2 })
              ? "bg-blue-600 text-white font-bold"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2.5 py-1 rounded transition font-bold ${
            editor.isActive("bold")
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Bold"
        >
          B
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1 rounded transition italic ${
            editor.isActive("italic")
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Italic"
        >
          I
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2.5 py-1 rounded transition ${
            editor.isActive("bulletList")
              ? "bg-blue-600 text-white font-bold"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Bullet List"
        >
          • List
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2.5 py-1 rounded transition ${
            editor.isActive("orderedList")
              ? "bg-blue-600 text-white font-bold"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Numbered List"
        >
          1. List
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2.5 py-1 rounded font-mono text-xs transition ${
            editor.isActive("codeBlock")
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Code Block"
        >
          &lt;/&gt; Code
        </button>

        <button
          type="button"
          onClick={setLink}
          className={`px-2.5 py-1 rounded transition ${
            editor.isActive("link")
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
          title="Insert Link"
        >
          🔗 Link
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-2.5 py-1 rounded bg-white text-gray-700 hover:bg-gray-200 border border-gray-200 text-xs flex items-center gap-1 transition disabled:opacity-50"
          title="Upload image file into content"
        >
          {uploading ? "Uploading..." : "📷 Upload Image"}
        </button>

        <button
          type="button"
          onClick={handleInsertImageUrl}
          className="px-2.5 py-1 rounded bg-white text-gray-700 hover:bg-gray-200 border border-gray-200 text-xs flex items-center gap-1 transition"
          title="Insert Image by URL"
        >
          🌐 Image URL
        </button>
      </div>

      {/* Editable Document Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
