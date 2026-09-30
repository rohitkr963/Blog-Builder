import test from "node:test";
import assert from "node:assert/strict";
import { measurePasswordStrength } from "../src/lib/password-strength.js";

test("reports the minimum length and strength for common password shapes", () => {
  assert.deepEqual(measurePasswordStrength(""), {
    score: 0,
    label: "Enter a password",
    meetsMinimum: false,
  });
  assert.equal(measurePasswordStrength("short7!").meetsMinimum, false);
  assert.equal(measurePasswordStrength("abcdefgh").label, "Weak");
  assert.equal(measurePasswordStrength("R0ck#SolidPass").label, "Strong");
});