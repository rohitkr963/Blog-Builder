const STRENGTH_LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"];

export function measurePasswordStrength(password = "") {
  const value = typeof password === "string" ? password : "";
  if (!value) {
    return { score: 0, label: "Enter a password", meetsMinimum: false };
  }

  const categories = [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^a-zA-Z0-9]/.test(value)]
    .filter(Boolean).length;
  let score = value.length >= 8 ? 1 : 0;

  if (value.length >= 12) score += 1;
  if (value.length >= 8 && categories >= 2) score += 1;
  if (value.length >= 8 && categories >= 3) score += 1;
  if (value.length >= 12 && categories === 4) score += 1;

  score = Math.min(score, 4);
  return {
    score,
    label: STRENGTH_LABELS[score],
    meetsMinimum: value.length >= 8,
  };
}