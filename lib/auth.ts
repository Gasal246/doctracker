import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AdminModel } from "@/lib/models/Admin";
import { UserModel } from "@/lib/models/User";
import type { SessionRole, SessionUser } from "@/lib/types";

const encoder = new TextEncoder();

export const USER_SESSION_COOKIE = "doc-tracker-user-session";
export const ADMIN_SESSION_COOKIE = "doc-tracker-admin-session";

type SessionPayload = {
  sub: string;
  role: SessionRole;
  email: string;
  name: string;
};

function getJwtSecret() {
  return encoder.encode(getEnv("AUTH_JWT_SECRET"));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(input: string, stored: string) {
  if (!stored) {
    return false;
  }

  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }

  return input === stored;
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function applySessionCookie(
  response: NextResponse,
  name: string,
  value: string,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(USER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function createUserSessionResponse(user: SessionUser) {
  const token = await signSession({
    sub: user.id,
    role: "user",
    email: user.email,
    name: user.name,
  });
  const response = NextResponse.json({ success: true, user });

  clearSessionCookies(response);
  applySessionCookie(response, USER_SESSION_COOKIE, token);

  return response;
}

export async function createAdminSessionResponse(admin: SessionUser) {
  const token = await signSession({
    sub: admin.id,
    role: "admin",
    email: admin.email,
    name: admin.name,
  });
  const response = NextResponse.json({ success: true, admin });

  clearSessionCookies(response);
  applySessionCookie(response, ADMIN_SESSION_COOKIE, token);

  return response;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  await connectToDatabase();

  const payload = await verifySession(token);

  if (!payload || payload.role !== "user") {
    return null;
  }

  const user = await UserModel.findById(payload.sub).lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  } satisfies SessionUser;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  await connectToDatabase();

  const payload = await verifySession(token);

  if (!payload || payload.role !== "admin") {
    return null;
  }

  const admin = await AdminModel.findById(payload.sub).lean();

  if (!admin) {
    return null;
  }

  return {
    id: admin._id.toString(),
    name: admin.name || "Administrator",
    email: admin.email,
  } satisfies SessionUser;
}
