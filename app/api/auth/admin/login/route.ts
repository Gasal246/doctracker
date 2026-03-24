import { NextResponse } from "next/server";

import {
  comparePassword,
  createAdminSessionResponse,
  getCurrentAdmin,
} from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, normalizeEmail } from "@/lib/http";
import { AdminModel } from "@/lib/models/Admin";

export async function POST(request: Request) {
  const existingAdmin = await getCurrentAdmin();

  if (existingAdmin) {
    return NextResponse.json({ success: true, admin: existingAdmin });
  }

  await connectToDatabase();

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = normalizeEmail(body.email || "");
  const password = body.password?.trim() || "";

  if (!email || !password) {
    return errorResponse("Email and password are required.");
  }

  const admin = await AdminModel.findOne({ email }).lean();

  if (!admin) {
    return errorResponse("Invalid admin credentials.", 401);
  }

  const secret = admin.passwordHash || admin.password;
  const isValid = await comparePassword(password, secret);

  if (!isValid) {
    return errorResponse("Invalid admin credentials.", 401);
  }

  return createAdminSessionResponse({
    id: admin._id.toString(),
    name: admin.name || "Administrator",
    email: admin.email,
  });
}
