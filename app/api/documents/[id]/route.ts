import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { validateDocumentFile } from "@/lib/document-upload";
import { deleteDocumentFile, uploadDocumentFile } from "@/lib/firebase-admin";
import { errorResponse, getStringValue } from "@/lib/http";
import { CategoryModel } from "@/lib/models/Category";
import { CompanyModel } from "@/lib/models/Company";
import { DocumentModel } from "@/lib/models/Document";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized.", 401);
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid document.");
    }

    await connectToDatabase();

    const document = await DocumentModel.findOne({ _id: id, userId: user.id });

    if (!document) {
      return errorResponse("Document not found.", 404);
    }

    const formData = await request.formData();
    const name = getStringValue(formData, "name");
    const companyId = getStringValue(formData, "companyId");
    const categoryId = getStringValue(formData, "categoryId");
    const expiryDate = getStringValue(formData, "expiryDate");
    const reminderAt = getStringValue(formData, "reminderAt");
    const file = formData.get("file");
    const fileError = validateDocumentFile(file);

    if (!name || !companyId || !categoryId || !expiryDate || !reminderAt) {
      return errorResponse("All document fields are required.");
    }

    if (fileError) {
      return errorResponse(fileError, 413);
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

    if (file instanceof File && file.size > 0) {
      await deleteDocumentFile(document.filePath || "");

      const fileData = await uploadDocumentFile(file, user.id);
      document.fileName = fileData.fileName;
      document.filePath = fileData.filePath;
      document.fileType = fileData.fileType;
      document.fileUrl = fileData.fileUrl;
    }

    const previousReminderAt = document.reminderAt.getTime();
    document.name = name;
    document.companyId = new Types.ObjectId(companyId);
    document.categoryId = new Types.ObjectId(categoryId);
    document.expiryDate = new Date(expiryDate);
    document.reminderAt = new Date(reminderAt);

    if (previousReminderAt !== document.reminderAt.getTime()) {
      document.reminderProcessedAt = null;
      document.reminderEmailSentAt = null;
      document.reminderPushSentAt = null;
    }

    await document.save();

    return Response.json({
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
        fileName: document.fileName || "",
        fileUrl: document.fileUrl || "",
        fileType: document.fileType || "FILE",
        createdAt: document.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Document update failed", error);

    return errorResponse(
      error instanceof Error ? error.message : "Unable to update document.",
      500,
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized.", 401);
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid document.");
    }

    await connectToDatabase();

    const document = await DocumentModel.findOneAndDelete({
      _id: id,
      userId: user.id,
    }).lean();

    if (!document) {
      return errorResponse("Document not found.", 404);
    }

    await deleteDocumentFile(document.filePath || "");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Document delete failed", error);

    return errorResponse(
      error instanceof Error ? error.message : "Unable to delete document.",
      500,
    );
  }
}
