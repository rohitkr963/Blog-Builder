"use client";

import { measurePasswordStrength } from "@/lib/password-strength";

const strengthColors = [
  "bg-gray-300",
  "bg-red-500",
  "bg-amber-500",
  "bg-sky-600",
  "bg-emerald-600",
];

export default function PasswordStrengthMeter({ password, id = "password-strength" }) {
  if (!password) return null;

  const strength = measurePasswordStrength(password);
  const color = strengthColors[strength.score];

  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={`h-1.5 rounded-full ${index < strength.score ? color : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
        <span className={strength.score > 0 ? "font-medium text-gray-700" : "text-gray-500"}>
          {strength.label}
        </span>
        <span className={strength.meetsMinimum ? "text-gray-500" : "font-medium text-red-700"}>
          {strength.meetsMinimum ? "8-character minimum met" : "At least 8 characters"}
        </span>
      </div>
    </div>
  );
}