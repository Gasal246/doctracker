import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue } from "@/lib/http";
import { CompanyModel } from "@/lib/models/Company";
import { serializeCompanies } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const companies = await serializeCompanies(user.id);

  return Response.json({ companies });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const name = getStringValue(body, "name");
  const email = getStringValue(body, "email");

  if (!name) {
    return errorResponse("Company name is required.");
  }

  const company = await CompanyModel.create({
    _id: new Types.ObjectId(),
    userId: user.id,
    name,
    email,
  });

  return Response.json(
    {
      success: true,
      company: {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        documentCount: 0,
        createdAt: company.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
