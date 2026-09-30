import test from "node:test";
import assert from "node:assert/strict";
import { optimizeUploadImage } from "../src/lib/optimize-upload-image.js";

test("optimizes large supported images and closes the decoded bitmap", async () => {
  const originalImageBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  const originalFile = globalThis.File;
  let bitmapClosed = false;
  let targetDimensions;

  globalThis.createImageBitmap = async () => ({
    width: 4000,
    height: 2000,
    close() {
      bitmapClosed = true;
    },
  });
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage(_bitmap, _x, _y, width, height) {
              targetDimensions = [width, height];
            },
          };
        },
        toBlob(callback, type, quality) {
          assert.equal(type, "image/webp");
          assert.equal(quality, 0.82);
          callback(new Blob([new Uint8Array(100)], { type }));
        },
      };
    },
  };
  globalThis.File = class extends Blob {
    constructor(parts, name, options) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified;
    }
  };

  try {
    const source = { type: "image/jpeg", name: "photo.jpg", size: 2_000_000 };
    const optimized = await optimizeUploadImage(source);

    assert.deepEqual(targetDimensions, [1600, 800]);
    assert.equal(optimized.type, "image/webp");
    assert.equal(optimized.name, "photo.webp");
    assert.equal(optimized.size, 100);
    assert.equal(bitmapClosed, true);

    const unsupported = { type: "image/gif", name: "animation.gif" };
    assert.equal(await optimizeUploadImage(unsupported), unsupported);
  } finally {
    if (originalImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalImageBitmap;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalFile === undefined) delete globalThis.File;
    else globalThis.File = originalFile;
  }
});