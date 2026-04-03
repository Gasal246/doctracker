import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { uploadDocumentFile } from "@/lib/firebase-admin";
import { errorResponse, getStringValue } from "@/lib/http";
import { CategoryModel } from "@/lib/models/Category";
import { CompanyModel } from "@/lib/models/Company";
import { DocumentModel } from "@/lib/models/Document";
import { serializeDocuments } from "@/lib/serializers";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const documents = await serializeDocuments(user.id);

  return Response.json({ documents });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized.", 401);
    }

    await connectToDatabase();

    const formData = await request.formData();
    const name = getStringValue(formData, "name");
    const companyId = getStringValue(formData, "companyId");
    const categoryId = getStringValue(formData, "categoryId");
    const expiryDate = getStringValue(formData, "expiryDate");
    const reminderAt = getStringValue(formData, "reminderAt");
    const file = formData.get("file");

    if (!name || !companyId || !categoryId || !expiryDate || !reminderAt) {
      return errorResponse("All document fields are required.");
    }

    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(categoryId)) {
      return errorResponse("Invalid company or category.");
    }

    const [company, category] = await Promise.all([
      CompanyModel.findOne({ _id: companyId, userId: user.id }).lean(),
      CategoryModel.findOne({ _id: categoryId, userId: user.id }).lean(),
    ]);

    if (!company || !category) {
      return errorResponse("Company or category not found.", 404);
    }

    let fileData = {
      fileName: "",
      filePath: "",
      fileType: "FILE",
      fileUrl: "",
    };

    if (file instanceof File && file.size > 0) {
      fileData = await uploadDocumentFile(file, user.id);
    }

    const document = await DocumentModel.create({
      _id: new Types.ObjectId(),
      userId: user.id,
      name,
      companyId,
      categoryId,
      expiryDate: new Date(expiryDate),
      reminderAt: new Date(reminderAt),
      reminderProcessedAt: null,
      reminderEmailSentAt: null,
      reminderPushSentAt: null,
      ...fileData,
    });

    return Response.json(
      {
        success: true,
        document: {
          id: document._id.toString(),
          name: document.name,
          companyId,
          companyName: company.name,
          categoryId,
          categoryName: category.name,
          expiryDate: document.expiryDate.toISOString(),
          reminderAt: document.reminderAt.toISOString(),
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileType: document.fileType,
          createdAt: document.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Document create failed", error);

    return errorResponse(
      error instanceof Error ? error.message : "Unable to upload document.",
      500,
    );
  }
}
