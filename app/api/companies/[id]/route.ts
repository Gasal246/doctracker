import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue } from "@/lib/http";
import { CompanyModel } from "@/lib/models/Company";
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
    return errorResponse("Invalid company.");
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const name = getStringValue(body, "name");
  const email = getStringValue(body, "email");

  if (!name) {
    return errorResponse("Company name is required.");
  }

  const company = await CompanyModel.findOneAndUpdate(
    { _id: id, userId: user.id },
    { name, email },
    { new: true },
  ).lean();

  if (!company) {
    return errorResponse("Company not found.", 404);
  }

  const documentCount = await DocumentModel.countDocuments({
    userId: user.id,
    companyId: company._id,
  });

  return Response.json({
    success: true,
    company: {
      id: company._id.toString(),
      name: company.name,
      email: company.email,
      documentCount,
      createdAt: company.createdAt.toISOString(),
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
    return errorResponse("Invalid company.");
  }

  await connectToDatabase();

  const linkedDocument = await DocumentModel.exists({
    userId: user.id,
    companyId: id,
  });

  if (linkedDocument) {
    return errorResponse(
      "Delete the linked documents before removing this company.",
    );
  }

  const deleted = await CompanyModel.findOneAndDelete({
    _id: id,
    userId: user.id,
  }).lean();

  if (!deleted) {
    return errorResponse("Company not found.", 404);
  }

  return Response.json({ success: true });
}
