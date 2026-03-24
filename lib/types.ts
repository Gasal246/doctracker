export type SessionRole = "user" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export type CompanyDto = {
  id: string;
  name: string;
  email: string;
  documentCount: number;
  createdAt: string;
};

export type CategoryDto = {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
};

export type DocumentDto = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  categoryId: string;
  categoryName: string;
  expiryDate: string;
  reminderAt: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
};

export type AdminUserDto = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};
