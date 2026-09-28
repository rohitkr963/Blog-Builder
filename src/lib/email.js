export async function sendPasswordResetEmail({ email, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(`Password reset link for ${email}: ${resetUrl}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your BlogCraft password",
      text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in one hour.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset email failed with status ${response.status}.`);
  }

  return { delivered: true };
}

export async function sendVerificationEmail({ email, verifyUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(`Email verification link for ${email}: ${verifyUrl}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your BlogCraft email",
      text: `Verify your email using this link: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    }),
  });

  if (!response.ok) throw new Error(`Verification email failed with status ${response.status}.`);
  return { delivered: true };
}