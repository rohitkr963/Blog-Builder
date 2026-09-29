import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeBlogContent } from "../src/lib/sanitize-blog-content.js";

test("removes executable markup and unsafe attributes", () => {
  const sanitized = sanitizeBlogContent(
    '<p>Safe copy</p><script>alert(1)</script><img src="https://example.com/image.png" onerror="alert(1)"><a href="javascript:alert(1)">unsafe link</a>'
  );

  assert.match(sanitized, /<p>Safe copy<\/p>/);
  assert.match(sanitized, /<img src="https:\/\/example\.com\/image\.png"\s\/>/);
  assert.doesNotMatch(sanitized, /<script|onerror|javascript:/i);
});

test("preserves supported article formatting and safe links", () => {
  const sanitized = sanitizeBlogContent(
    '<h2>Heading</h2><p><strong>Important</strong> <a href="https://example.com">source</a></p><pre><code>const answer = 42;</code></pre>'
  );

  assert.match(sanitized, /<h2>Heading<\/h2>/);
  assert.match(sanitized, /<strong>Important<\/strong>/);
  assert.match(sanitized, /<a href="https:\/\/example\.com">source<\/a>/);
  assert.match(sanitized, /<pre><code>const answer = 42;<\/code><\/pre>/);
});