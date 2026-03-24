import { Types } from "mongoose";

import { CategoryModel } from "@/lib/models/Category";
import { CompanyModel } from "@/lib/models/Company";
import { DocumentModel } from "@/lib/models/Document";
import { UserModel } from "@/lib/models/User";
import type {
  AdminUserDto,
  CategoryDto,
  CompanyDto,
  DocumentDto,
} from "@/lib/types";

export async function serializeUsers(userId?: string): Promise<AdminUserDto[]> {
  const query = userId ? { _id: userId } : {};
  const users = await UserModel.find(query).sort({ createdAt: -1 }).lean();

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  }));
}

export async function serializeCompanies(userId: string): Promise<CompanyDto[]> {
  const objectUserId = new Types.ObjectId(userId);
  const [companies, counts] = await Promise.all([
    CompanyModel.find({ userId }).sort({ createdAt: -1 }).lean(),
    DocumentModel.aggregate<{ _id: string; count: number }>([
      { $match: { userId: objectUserId } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

  return companies.map((company) => ({
    id: company._id.toString(),
    name: company.name,
    email: company.email || "",
    documentCount: countMap.get(company._id.toString()) || 0,
    createdAt: company.createdAt.toISOString(),
  }));
}

export async function serializeCategories(
  userId: string,
): Promise<CategoryDto[]> {
  const objectUserId = new Types.ObjectId(userId);
  const [categories, counts] = await Promise.all([
    CategoryModel.find({ userId }).sort({ createdAt: -1 }).lean(),
    DocumentModel.aggregate<{ _id: string; count: number }>([
      { $match: { userId: objectUserId } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    documentCount: countMap.get(category._id.toString()) || 0,
    createdAt: category.createdAt.toISOString(),
  }));
}

export async function serializeDocuments(userId: string): Promise<DocumentDto[]> {
  const documents = await DocumentModel.find({ userId })
    .populate("companyId", "name")
    .populate("categoryId", "name")
    .sort({ expiryDate: 1, createdAt: -1 })
    .lean();

  return documents.map((document) => ({
    id: document._id.toString(),
    name: document.name,
    companyId: document.companyId._id.toString(),
    companyName: document.companyId.name,
    categoryId: document.categoryId._id.toString(),
    categoryName: document.categoryId.name,
    expiryDate: document.expiryDate.toISOString(),
    reminderAt: document.reminderAt.toISOString(),
    fileName: document.fileName || "",
    fileUrl: document.fileUrl || "",
    fileType: document.fileType || "FILE",
    createdAt: document.createdAt.toISOString(),
  }));
}
