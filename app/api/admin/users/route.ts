import { Types } from "mongoose";

import { getCurrentAdmin, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, normalizeEmail } from "@/lib/http";
import { UserModel } from "@/lib/models/User";
import { serializeUsers } from "@/lib/serializers";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const users = await serializeUsers();

  return Response.json({ users });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = body.name?.trim() || "";
  const email = normalizeEmail(body.email || "");
  const password = body.password?.trim() || "";

  if (!name || !email || !password) {
    return errorResponse("Name, email, and password are required.");
  }

  const existingUser = await UserModel.findOne({ email }).lean();

  if (existingUser) {
    return errorResponse("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await UserModel.create({
    _id: new Types.ObjectId(),
    name,
    email,
    passwordHash,
  });

  return Response.json(
    {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
