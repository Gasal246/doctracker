import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue } from "@/lib/http";
import { CategoryModel } from "@/lib/models/Category";
import { DocumentModel } from "@/lib/models/Document";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return errorResponse("Invalid category.");
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const name = getStringValue(body, "name");

  if (!name) {
    return errorResponse("Category name is required.");
  }

  const category = await CategoryModel.findOneAndUpdate(
    { _id: id, userId: user.id },
    { name },
    { new: true },
  ).lean();

  if (!category) {
    return errorResponse("Category not found.", 404);
  }

  const documentCount = await DocumentModel.countDocuments({
    userId: user.id,
    categoryId: category._id,
  });

  return Response.json({
    success: true,
    category: {
      id: category._id.toString(),
      name: category.name,
      documentCount,
      createdAt: category.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return errorResponse("Invalid category.");
  }

  await connectToDatabase();

  const linkedDocument = await DocumentModel.exists({
    userId: user.id,
    categoryId: id,
  });

  if (linkedDocument) {
    return errorResponse(
      "Delete the linked documents before removing this category.",
    );
  }

  const deleted = await CategoryModel.findOneAndDelete({
    _id: id,
    userId: user.id,
  }).lean();

  if (!deleted) {
    return errorResponse("Category not found.", 404);
  }

  return Response.json({ success: true });
}
