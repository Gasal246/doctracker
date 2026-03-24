import { NextResponse } from "next/server";

import {
  comparePassword,
  createUserSessionResponse,
  getCurrentUser,
} from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, normalizeEmail } from "@/lib/http";
import { UserModel } from "@/lib/models/User";

export async function POST(request: Request) {
  try {
    const existingUser = await getCurrentUser();

    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
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

    const user = await UserModel.findOne({ email }).lean();

    if (!user) {
      return errorResponse("Invalid email or password.", 401);
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return errorResponse("Invalid email or password.", 401);
    }

    return createUserSessionResponse({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in.";

    return errorResponse(message, 500);
  }
}
