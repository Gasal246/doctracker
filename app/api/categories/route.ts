import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue } from "@/lib/http";
import { CategoryModel } from "@/lib/models/Category";
import { serializeCategories } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const categories = await serializeCategories(user.id);

  return Response.json({ categories });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const name = getStringValue(body, "name");

  if (!name) {
    return errorResponse("Category name is required.");
  }

  const category = await CategoryModel.create({
    _id: new Types.ObjectId(),
    userId: user.id,
    name,
  });

  return Response.json(
    {
      success: true,
      category: {
        id: category._id.toString(),
        name: category.name,
        documentCount: 0,
        createdAt: category.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
