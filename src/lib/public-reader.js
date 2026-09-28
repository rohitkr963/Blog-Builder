import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const READER_COOKIE = "blog_reader";
const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function signReaderId(readerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is missing.");
  return createHmac("sha256", secret).update(readerId).digest("hex");
}

function verifyReaderCookie(value) {
  if (typeof value !== "string") return null;
  const separator = value.lastIndexOf(".");
  if (separator < 0) return null;

  const readerId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(readerId) || !/^[0-9a-f]{64}$/i.test(signature)) {
    return null;
  }

  const expected = signReaderId(readerId);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return timingSafeEqual(providedBuffer, expectedBuffer) ? readerId : null;
}

export async function getPublicReader() {
  const cookieStore = await cookies();
  const existingValue = cookieStore.get(READER_COOKIE)?.value;
  const existingId = verifyReaderCookie(existingValue);

  if (existingId) return { readerId: existingId, needsCookie: false };
  return { readerId: randomUUID(), needsCookie: true };
}

export function setPublicReaderCookie(response, readerId, needsCookie) {
  if (needsCookie) {
    response.cookies.set({
      name: READER_COOKIE,
      value: `${readerId}.${signReaderId(readerId)}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: READER_COOKIE_MAX_AGE,
    });
  }
  return response;
}