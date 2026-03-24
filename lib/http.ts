import { NextResponse } from "next/server";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getStringValue(
  source: FormData | Record<string, unknown>,
  key: string,
) {
  const value = source instanceof FormData ? source.get(key) : source[key];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}
