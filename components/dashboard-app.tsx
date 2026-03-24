"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AvatarMark,
  BrandMark,
  ModalShell,
  SketchBadge,
  SketchButton,
  SketchCard,
  SketchInput,
  SketchSelectMenu,
  StatusBanner,
} from "@/components/sketch-ui";
import { NotificationEnrollment } from "@/components/notification-enrollment";
import type {
  CategoryDto,
  CompanyDto,
  DocumentDto,
  SessionUser,
} from "@/lib/types";

type SectionKey = "documents" | "companies" | "categories" | "profile";

type ContextMenuState =
  | {
      entity: "category" | "company" | "document";
      id: string;
      x: number;
      y: number;
    }
  | null;

type DeleteDialogState =
  | {
      entity: "category" | "company" | "document";
      id: string;
      name: string;
    }
  | null;

type DocumentFormState = {
  categoryId: string;
  companyId: string;
  expiryDate: string;
  file: File | null;
  id: string | null;
  name: string;
  reminderAt: string;
};

type CompanyFormState = {
  email: string;
  id: string | null;
  name: string;
};

type CategoryFormState = {
  id: string | null;
  name: string;
};

type ProfilePasswordFormState = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

const sectionItems: { key: SectionKey; label: string }[] = [
  { key: "documents", label: "Documents" },
  { key: "companies", label: "Companies" },
  { key: "categories", label: "Categories" },
  { key: "profile", label: "Profile" },
];

const emptyDocumentForm: DocumentFormState = {
  id: null,
  name: "",
  companyId: "",
  categoryId: "",
  expiryDate: "",
  reminderAt: "",
  file: null,
};

const emptyCompanyForm: CompanyFormState = {
  id: null,
  name: "",
  email: "",
};

const emptyCategoryForm: CategoryFormState = {
  id: null,
  name: "",
};

const emptyPasswordForm: ProfilePasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatReminderLabel(reminderAt: string) {
  const now = new Date();
  const target = new Date(reminderAt);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays <= 1) {
    return "01 Day";
  }

  if (diffDays < 30) {
    return `${String(diffDays).padStart(2, "0")} Days`;
  }

  const diffMonths = Math.max(1, Math.round(diffDays / 30));

  return `${String(diffMonths).padStart(2, "0")} Months`;
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function readJson<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: text || "Request failed.",
    } as T;
  }
}

export function DashboardApp({
  initialSection,
  user,
}: {
  initialSection: SectionKey;
  user: SessionUser;
}) {
  const router = useRouter();
  const filterRef = useRef<HTMLDivElement | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const skipNextTapRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [section, setSection] = useState<SectionKey>(initialSection);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"danger" | "primary">("primary");
  const [busyAction, setBusyAction] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [documentForm, setDocumentForm] =
    useState<DocumentFormState>(emptyDocumentForm);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(emptyCompanyForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  });
  const [passwordForm, setPasswordForm] =
    useState<ProfilePasswordFormState>(emptyPasswordForm);
  const [documentSearch, setDocumentSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const deferredDocumentSearch = useDeferredValue(documentSearch);
  const deferredCompanySearch = useDeferredValue(companySearch);
  const deferredCategorySearch = useDeferredValue(categorySearch);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterMenu, setActiveFilterMenu] = useState<
    "category" | "company" | null
  >(null);
  const [filters, setFilters] = useState({
    categoryId: "",
    companyId: "",
  });
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [documentFilePreviewUrl, setDocumentFilePreviewUrl] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (!documentForm.file || !documentForm.file.type.startsWith("image/")) {
      setDocumentFilePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(documentForm.file);
    setDocumentFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [documentForm.file]);

  useEffect(() => {
    function handleGlobalClick() {
      setContextMenu(null);
    }

    function handleFilterClick(event: MouseEvent) {
      if (filterRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsFilterOpen(false);
      setActiveFilterMenu(null);
    }

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("mousedown", handleFilterClick);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("mousedown", handleFilterClick);
    };
  }, []);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);

      try {
        const [documentsResponse, companiesResponse, categoriesResponse] =
          await Promise.all([
            fetch("/api/documents"),
            fetch("/api/companies"),
            fetch("/api/categories"),
          ]);

        const [documentsData, companiesData, categoriesData] = await Promise.all([
          readJson<{ documents?: DocumentDto[]; error?: string }>(documentsResponse),
          readJson<{ companies?: CompanyDto[]; error?: string }>(companiesResponse),
          readJson<{ categories?: CategoryDto[]; error?: string }>(
            categoriesResponse,
          ),
        ]);

        if (!documentsResponse.ok) {
          throw new Error(documentsData.error || "Unable to load documents.");
        }

        if (!companiesResponse.ok) {
          throw new Error(companiesData.error || "Unable to load companies.");
        }

        if (!categoriesResponse.ok) {
          throw new Error(categoriesData.error || "Unable to load categories.");
        }

        setDocuments(documentsData.documents || []);
        setCompanies(companiesData.companies || []);
        setCategories(categoriesData.categories || []);
      } catch (error) {
        pushMessage(
          error instanceof Error ? error.message : "Unable to load workspace.",
          "danger",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollReminders() {
      try {
        await fetch("/api/reminders/poll", {
          method: "POST",
        });
      } catch {
        if (!cancelled) {
          // Ignore transient polling errors in the UI.
        }
      }
    }

    void pollReminders();
    const intervalId = window.setInterval(() => {
      void pollReminders();
    }, 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  function pushMessage(nextMessage: string, tone: "danger" | "primary") {
    setMessage(nextMessage);
    setStatusTone(tone);
  }

  function moveToSection(nextSection: SectionKey) {
    setSection(nextSection);
    setIsMobileSidebarOpen(false);
    startTransition(() => {
      router.push(`/dashboard/${nextSection}`);
    });
  }

  async function handleSignOut(nextPath = "/login") {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsMobileSidebarOpen(false);
    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  }

  function countCompanyDocuments(companyId: string) {
    return documents.filter((document) => document.companyId === companyId).length;
  }

  function countCategoryDocuments(categoryId: string) {
    return documents.filter((document) => document.categoryId === categoryId).length;
  }

  function openDocumentCreateModal() {
    setDocumentForm(emptyDocumentForm);
    setDocumentFilePreviewUrl("");
    setIsDocumentModalOpen(true);
  }

  function openDocumentEditModal(document: DocumentDto) {
    setDocumentForm({
      id: document.id,
      name: document.name,
      companyId: document.companyId,
      categoryId: document.categoryId,
      expiryDate: toDateInputValue(document.expiryDate),
      reminderAt: toDateTimeInputValue(document.reminderAt),
      file: null,
    });
    setDocumentFilePreviewUrl("");
    setIsDocumentModalOpen(true);
  }

  function clearSelectedDocumentFile() {
    setDocumentForm((current) => ({
      ...current,
      file: null,
    }));
    setDocumentFilePreviewUrl("");

    if (documentFileInputRef.current) {
      documentFileInputRef.current.value = "";
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openTouchContextMenu(
    entity: "category" | "company" | "document",
    id: string,
    x: number,
    y: number,
  ) {
    skipNextTapRef.current = true;
    setContextMenu({
      entity,
      id,
      x: Math.min(window.innerWidth - 200, Math.max(12, x)),
      y: Math.min(window.innerHeight - 120, Math.max(12, y)),
    });
  }

  function startLongPress(
    event: React.TouchEvent<HTMLElement>,
    entity: "category" | "company" | "document",
    id: string,
  ) {
    clearLongPressTimer();
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    const x = touch.clientX;
    const y = touch.clientY;

    longPressTimerRef.current = window.setTimeout(() => {
      openTouchContextMenu(entity, id, x, y);
    }, 550);
  }

  function handleCardTap(action?: () => void) {
    if (skipNextTapRef.current) {
      skipNextTapRef.current = false;
      return;
    }

    action?.();
  }

  function openCompanyEditModal(company: CompanyDto) {
    setCompanyForm({
      id: company.id,
      name: company.name,
      email: company.email,
    });
    setIsCompanyModalOpen(true);
  }

  function openCategoryEditModal(category: CategoryDto) {
    setCategoryForm({
      id: category.id,
      name: category.name,
    });
    setIsCategoryModalOpen(true);
  }

  async function handleDocumentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("document");

    try {
      const formData = new FormData();
      formData.set("name", documentForm.name);
      formData.set("companyId", documentForm.companyId);
      formData.set("categoryId", documentForm.categoryId);
      formData.set("expiryDate", documentForm.expiryDate);
      formData.set("reminderAt", documentForm.reminderAt);

      if (documentForm.file) {
        formData.set("file", documentForm.file);
      }

      const isEditing = Boolean(documentForm.id);
      const response = await fetch(
        isEditing ? `/api/documents/${documentForm.id}` : "/api/documents",
        {
          method: isEditing ? "PATCH" : "POST",
          body: formData,
        },
      );
      const data = await readJson<{ document?: DocumentDto; error?: string }>(
        response,
      );

      if (!response.ok || !data.document) {
        throw new Error(data.error || "Unable to save document.");
      }

      setDocuments((current) =>
        isEditing
          ? current.map((item) => (item.id === data.document!.id ? data.document! : item))
          : [data.document!, ...current],
      );
      setIsDocumentModalOpen(false);
      setDocumentForm(emptyDocumentForm);
      pushMessage(
        isEditing ? "Document updated successfully." : "Document added successfully.",
        "primary",
      );
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to save document.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteDocument(id: string) {
    setBusyAction(`delete-document-${id}`);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      const data = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete document.");
      }

      setDocuments((current) => current.filter((item) => item.id !== id));
      if (selectedDocumentId === id) {
        setSelectedDocumentId("");
      }
      pushMessage("Document deleted successfully.", "primary");
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to delete document.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleCompanySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("company");

    try {
      const isEditing = Boolean(companyForm.id);
      const response = await fetch(
        isEditing ? `/api/companies/${companyForm.id}` : "/api/companies",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyForm.name,
            email: companyForm.email,
          }),
        },
      );
      const data = await readJson<{ company?: CompanyDto; error?: string }>(
        response,
      );

      if (!response.ok || !data.company) {
        throw new Error(data.error || "Unable to save company.");
      }

      setCompanies((current) =>
        isEditing
          ? current.map((item) => (item.id === data.company!.id ? data.company! : item))
          : [data.company!, ...current],
      );
      setIsCompanyModalOpen(false);
      setCompanyForm(emptyCompanyForm);
      pushMessage(
        isEditing ? "Company updated successfully." : "Company added successfully.",
        "primary",
      );
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to save company.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteCompany(id: string) {
    setBusyAction(`delete-company-${id}`);

    try {
      const response = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const data = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete company.");
      }

      setCompanies((current) => current.filter((item) => item.id !== id));
      pushMessage("Company deleted successfully.", "primary");
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to delete company.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("category");

    try {
      const isEditing = Boolean(categoryForm.id);
      const response = await fetch(
        isEditing ? `/api/categories/${categoryForm.id}` : "/api/categories",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: categoryForm.name,
          }),
        },
      );
      const data = await readJson<{ category?: CategoryDto; error?: string }>(
        response,
      );

      if (!response.ok || !data.category) {
        throw new Error(data.error || "Unable to save category.");
      }

      setCategories((current) =>
        isEditing
          ? current.map((item) =>
              item.id === data.category!.id ? data.category! : item,
            )
          : [data.category!, ...current],
      );
      setIsCategoryModalOpen(false);
      setCategoryForm(emptyCategoryForm);
      pushMessage(
        isEditing ? "Category updated successfully." : "Category added successfully.",
        "primary",
      );
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to save category.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteCategory(id: string) {
    setBusyAction(`delete-category-${id}`);

    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete category.");
      }

      setCategories((current) => current.filter((item) => item.id !== id));
      pushMessage("Category deleted successfully.", "primary");
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to delete category.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("profile");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });
      const data = await readJson<{ error?: string; user?: SessionUser }>(response);

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setCurrentUser(data.user);
      setProfileForm({
        name: data.user.name,
        email: data.user.email,
      });
      pushMessage("Profile updated successfully.", "primary");
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to update profile.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("password");

    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });
      const data = await readJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Unable to update password.");
      }

      setPasswordForm(emptyPasswordForm);
      pushMessage("Password updated successfully.", "primary");
    } catch (error) {
      pushMessage(
        error instanceof Error ? error.message : "Unable to update password.",
        "danger",
      );
    } finally {
      setBusyAction("");
    }
  }

  const visibleDocuments = documents.filter((document) => {
    const query = deferredDocumentSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      document.name.toLowerCase().includes(query) ||
      document.companyName.toLowerCase().includes(query) ||
      document.categoryName.toLowerCase().includes(query);
    const matchesCompany =
      !filters.companyId || document.companyId === filters.companyId;
    const matchesCategory =
      !filters.categoryId || document.categoryId === filters.categoryId;
    const matchesDueFilter = !showDueOnly || isReminderDue(document.reminderAt);

    return matchesSearch && matchesCompany && matchesCategory && matchesDueFilter;
  });

  const visibleCompanies = companies.filter((company) => {
    const query = deferredCompanySearch.trim().toLowerCase();

    return (
      !query ||
      company.name.toLowerCase().includes(query) ||
      company.email.toLowerCase().includes(query)
    );
  });

  const visibleCategories = categories.filter((category) => {
    const query = deferredCategorySearch.trim().toLowerCase();

    return !query || category.name.toLowerCase().includes(query);
  });

  const activeFilterLabel = [
    filters.companyId
      ? companies.find((company) => company.id === filters.companyId)?.name
      : "",
    filters.categoryId
      ? categories.find((category) => category.id === filters.categoryId)?.name
      : "",
  ]
    .filter(Boolean)
    .join(" / ");
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) || null;

  function isReminderDue(reminderAt: string) {
    return new Date(reminderAt).getTime() <= Date.now();
  }

  const dueDocumentsCount = documents.filter((document) =>
    isReminderDue(document.reminderAt),
  ).length;

  function renderDocumentsSection() {
    if (selectedDocument) {
      return (
        <>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <button
                className="text-xl underline decoration-[3px] underline-offset-4"
                onClick={() => setSelectedDocumentId("")}
                type="button"
              >
                Back to Documents
              </button>
              <h1 className="text-5xl leading-none md:text-6xl">
                {selectedDocument.name}
              </h1>
            </div>

            <SketchButton onClick={() => openDocumentEditModal(selectedDocument)}>
              Edit Doc
            </SketchButton>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <SketchBadge>{selectedDocument.companyName}</SketchBadge>
            <SketchBadge>{selectedDocument.categoryName}</SketchBadge>
            <SketchBadge>{selectedDocument.fileType}</SketchBadge>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.45)] px-4 py-3 shadow-[2px_2px_0_rgba(34,31,28,0.45)]">
              <p className="text-xl text-[var(--sketch-muted)]">Expiry At</p>
              <p className="text-3xl leading-none">
                {formatDate(selectedDocument.expiryDate)}
              </p>
            </div>
            <div className="rounded-[24px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.45)] px-4 py-3 shadow-[2px_2px_0_rgba(34,31,28,0.45)]">
              <p className="text-xl text-[var(--sketch-muted)]">Remind At</p>
              <p className="text-3xl leading-none">
                {formatDateTime(selectedDocument.reminderAt)}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[34px] border-[4px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.36)] p-4 shadow-[3px_3px_0_rgba(34,31,28,0.55)]">
            {selectedDocument.fileUrl ? (
              <>
                <button
                  aria-label="View full screen"
                  className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-[16px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.92)] shadow-[2px_2px_0_rgba(34,31,28,0.45)]"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M8 8 3 3M16 8l5-5M16 16l5 5M8 16l-5 5"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </button>

                <iframe
                  className="h-[68vh] w-full rounded-[26px] border-[3px] border-[var(--sketch-ink)] bg-white"
                  src={selectedDocument.fileUrl}
                  title={selectedDocument.name}
                />
              </>
            ) : (
              <div className="flex h-[68vh] flex-col items-center justify-center rounded-[26px] border-[3px] border-dashed border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.5)] text-center">
                <p className="text-4xl leading-none">No preview available</p>
                <p className="mt-3 text-2xl text-[var(--sketch-muted)]">
                  This document does not have an uploaded file.
                </p>
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        <SectionHeader
          action={
            <div className="flex flex-wrap items-center gap-3">
              <button
                aria-label="Toggle due reminders filter"
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-[var(--sketch-ink)] shadow-[2px_2px_0_rgba(34,31,28,0.45)] transition ${
                  showDueOnly
                    ? "bg-[var(--sketch-red)] text-white"
                    : "bg-[rgba(255,255,255,0.72)] text-[var(--sketch-ink)]"
                }`}
                onClick={() => setShowDueOnly((current) => !current)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 17H5l1.6-2.2a3 3 0 0 0 .6-1.8V10a5 5 0 1 1 10 0v2.9a3 3 0 0 0 .6 1.8L19 17h-4Zm-4 0a2 2 0 1 0 4 0"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>

                <span className="absolute -right-2 -top-2 flex min-h-8 min-w-8 items-center justify-center rounded-full border-[3px] border-[var(--sketch-ink)] bg-[var(--sketch-red)] px-1 text-base leading-none text-white shadow-[1px_1px_0_rgba(34,31,28,0.45)]">
                  {dueDocumentsCount}
                </span>
              </button>

              <SketchButton onClick={openDocumentCreateModal}>+ Add Document</SketchButton>
            </div>
          }
          title="All Documents"
        />

        {showDueOnly ? (
          <div className="mb-5">
            <StatusBanner
              message="Showing only documents whose reminder time has already passed."
              tone="danger"
            />
          </div>
        ) : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-center">
          <SketchInput
            className="w-full max-w-3xl"
            onChange={(event) => setDocumentSearch(event.target.value)}
            placeholder="search documents"
            value={documentSearch}
          />

          <div className="relative w-full lg:w-auto" ref={filterRef}>
            <SketchButton
              className="min-w-[170px] max-w-full"
              onClick={(event) => {
                event.stopPropagation();
                setIsFilterOpen((current) => !current);
                setActiveFilterMenu(null);
              }}
              tone="muted"
            >
              Filter{activeFilterLabel ? `: ${activeFilterLabel}` : ""}
            </SketchButton>

            {isFilterOpen ? (
              <div
                className="sketch-context-menu absolute right-0 top-[calc(100%+12px)] z-30 w-full max-w-[26rem] lg:w-[26rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="rounded-[16px] border-[2px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.45)] p-2">
                    <button
                      className="flex w-full items-center justify-between rounded-[14px] px-2 py-2 text-left text-xl transition hover:bg-[rgba(89,126,160,0.14)]"
                      onClick={() =>
                        setActiveFilterMenu((current) =>
                          current === "company" ? null : "company",
                        )
                      }
                      type="button"
                    >
                      Company
                      <span>{activeFilterMenu === "company" ? "−" : "+"}</span>
                    </button>

                    {activeFilterMenu === "company" ? (
                      <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto px-1 pb-1">
                        <button
                          className="sketch-badge transition hover:bg-[rgba(89,126,160,0.14)]"
                          onClick={() => {
                            setFilters((current) => ({
                              ...current,
                              companyId: "",
                            }));
                            setIsFilterOpen(false);
                            setActiveFilterMenu(null);
                          }}
                          type="button"
                        >
                          All Companies
                        </button>
                        {companies.map((company) => (
                          <button
                            className="sketch-badge transition hover:bg-[rgba(89,126,160,0.14)]"
                            key={company.id}
                            onClick={() => {
                              setFilters((current) => ({
                                ...current,
                                companyId: company.id,
                              }));
                              setIsFilterOpen(false);
                              setActiveFilterMenu(null);
                            }}
                            type="button"
                          >
                            {company.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[16px] border-[2px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.45)] p-2">
                    <button
                      className="flex w-full items-center justify-between rounded-[14px] px-2 py-2 text-left text-xl transition hover:bg-[rgba(89,126,160,0.14)]"
                      onClick={() =>
                        setActiveFilterMenu((current) =>
                          current === "category" ? null : "category",
                        )
                      }
                      type="button"
                    >
                      Category
                      <span>{activeFilterMenu === "category" ? "−" : "+"}</span>
                    </button>

                    {activeFilterMenu === "category" ? (
                      <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto px-1 pb-1">
                        <button
                          className="sketch-badge transition hover:bg-[rgba(89,126,160,0.14)]"
                          onClick={() => {
                            setFilters((current) => ({
                              ...current,
                              categoryId: "",
                            }));
                            setIsFilterOpen(false);
                            setActiveFilterMenu(null);
                          }}
                          type="button"
                        >
                          All Categories
                        </button>
                        {categories.map((category) => (
                          <button
                            className="sketch-badge transition hover:bg-[rgba(89,126,160,0.14)]"
                            key={category.id}
                            onClick={() => {
                              setFilters((current) => ({
                                ...current,
                                categoryId: category.id,
                              }));
                              setIsFilterOpen(false);
                              setActiveFilterMenu(null);
                            }}
                            type="button"
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  className="mt-3 flex w-full rounded-[16px] px-3 py-2 text-left text-xl transition hover:bg-[rgba(210,120,120,0.18)]"
                  onClick={() => {
                    setFilters({ companyId: "", categoryId: "" });
                    setIsFilterOpen(false);
                    setActiveFilterMenu(null);
                  }}
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {visibleDocuments.map((document) => (
            <SketchCard
              className="cursor-pointer space-y-5 p-5"
              key={document.id}
              onClick={() => handleCardTap(() => setSelectedDocumentId(document.id))}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  entity: "document",
                  id: document.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onTouchEnd={clearLongPressTimer}
              onTouchMove={clearLongPressTimer}
              onTouchStart={(event) =>
                startLongPress(event, "document", document.id)
              }
            >
              <div className="relative">
                {isReminderDue(document.reminderAt) ? (
                  <div className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[var(--sketch-ink)] bg-[var(--sketch-red)] text-white shadow-[2px_2px_0_rgba(34,31,28,0.45)]">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 17H5l1.6-2.2a3 3 0 0 0 .6-1.8V10a5 5 0 1 1 10 0v2.9a3 3 0 0 0 .6 1.8L19 17h-4Zm-4 0a2 2 0 1 0 4 0"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ) : null}

                <h3 className="text-3xl leading-none">{document.name}</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <SketchBadge>{document.companyName}</SketchBadge>
                  <SketchBadge>{document.categoryName}</SketchBadge>
                  {document.fileUrl ? (
                    <Link
                      className="sketch-badge"
                      href={document.fileUrl}
                      target="_blank"
                    >
                      {document.fileType}
                    </Link>
                  ) : (
                    <SketchBadge>{document.fileType}</SketchBadge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-[22px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.58)]">
                <div className="border-r-[3px] border-[var(--sketch-ink)] px-4 py-3">
                  <p className="text-xl text-[var(--sketch-muted)]">Reminder in</p>
                  <p className="text-2xl leading-none">
                    {formatReminderLabel(document.reminderAt)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl text-[var(--sketch-muted)]">Expire At</p>
                  <p className="text-2xl leading-none">
                    {formatDate(document.expiryDate)}
                  </p>
                </div>
              </div>
            </SketchCard>
          ))}

          {!visibleDocuments.length ? (
            <SketchCard className="p-5 xl:col-span-3">
              <p className="text-3xl leading-none">No documents found</p>
              <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                Add your first document or adjust the current search and filters.
              </p>
            </SketchCard>
          ) : null}
        </div>
      </>
    );
  }

  function renderCompaniesSection() {
    return (
      <>
        <SectionHeader
          action={
            <SketchButton
              onClick={() => {
                setCompanyForm(emptyCompanyForm);
                setIsCompanyModalOpen(true);
              }}
            >
              + Add Company
            </SketchButton>
          }
          title="Companies"
        />

        <div className="mb-8 flex justify-center">
          <SketchInput
            className="w-full max-w-3xl"
            onChange={(event) => setCompanySearch(event.target.value)}
            placeholder="search companies"
            value={companySearch}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {visibleCompanies.map((company) => (
            <SketchCard
              className="space-y-3 p-5"
              key={company.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  entity: "company",
                  id: company.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onTouchEnd={clearLongPressTimer}
              onTouchMove={clearLongPressTimer}
              onTouchStart={(event) =>
                startLongPress(event, "company", company.id)
              }
            >
              <div>
                <h3 className="text-3xl leading-none">{company.name}</h3>
                <p className="mt-2 text-2xl text-[var(--sketch-muted)]">
                  {company.email || "No email added"}
                </p>
              </div>
              <SketchBadge className="w-fit">
                {countCompanyDocuments(company.id)} Docs
              </SketchBadge>
            </SketchCard>
          ))}

          {!visibleCompanies.length ? (
            <SketchCard className="p-5 xl:col-span-3">
              <p className="text-3xl leading-none">No companies found</p>
              <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                Add a company to start organizing documents.
              </p>
            </SketchCard>
          ) : null}
        </div>
      </>
    );
  }

  function renderCategoriesSection() {
    return (
      <>
        <SectionHeader
          action={
            <SketchButton
              onClick={() => {
                setCategoryForm(emptyCategoryForm);
                setIsCategoryModalOpen(true);
              }}
            >
              + Add Category
            </SketchButton>
          }
          title="Categories"
        />

        <div className="mb-8 flex justify-center">
          <SketchInput
            className="w-full max-w-2xl"
            onChange={(event) => setCategorySearch(event.target.value)}
            placeholder="search categories"
            value={categorySearch}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleCategories.map((category) => (
            <SketchCard
              className="p-4"
              key={category.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  entity: "category",
                  id: category.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onTouchEnd={clearLongPressTimer}
              onTouchMove={clearLongPressTimer}
              onTouchStart={(event) =>
                startLongPress(event, "category", category.id)
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl leading-none">{category.name}</p>
                <SketchBadge>{countCategoryDocuments(category.id)}</SketchBadge>
              </div>
            </SketchCard>
          ))}

          {!visibleCategories.length ? (
            <SketchCard className="p-5 md:col-span-2 xl:col-span-4">
              <p className="text-3xl leading-none">No categories found</p>
              <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                Create a category to group your documents.
              </p>
            </SketchCard>
          ) : null}
        </div>
      </>
    );
  }

  function renderProfileSection() {
    return (
      <>
        <SectionHeader
          action={
            <SketchButton onClick={() => void handleSignOut()} tone="danger">
              Sign Out
            </SketchButton>
          }
          title="Your Profile"
        />

        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <AvatarMark size="lg" />
            <div>
              <p className="text-5xl leading-none">{currentUser.name}</p>
              <p className="mt-3 text-3xl text-[var(--sketch-muted)]">
                {currentUser.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,580px)_minmax(0,580px)]">
          <form className="space-y-5" onSubmit={handleProfileSave}>
            <div className="space-y-4">
              <h2 className="text-4xl leading-none">Edit Profile</h2>
              <div className="space-y-2">
                <label className="text-2xl" htmlFor="profile-name">
                  Name
                </label>
                <SketchInput
                  id="profile-name"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={profileForm.name}
                />
              </div>
              <div className="space-y-2">
                <label className="text-2xl" htmlFor="profile-email">
                  Email
                </label>
                <SketchInput
                  id="profile-email"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={profileForm.email}
                />
              </div>
            </div>

            <SketchButton disabled={busyAction === "profile"} type="submit">
              {busyAction === "profile" ? "Saving..." : "Save"}
            </SketchButton>
          </form>

          <form className="space-y-5" onSubmit={handlePasswordSave}>
            <div className="space-y-4">
              <h2 className="text-4xl leading-none">Change Password</h2>
              <SketchInput
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                placeholder="Current Password"
                type="password"
                value={passwordForm.currentPassword}
              />
              <SketchInput
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                placeholder="New Password"
                type="password"
                value={passwordForm.newPassword}
              />
              <SketchInput
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Re-enter Password"
                type="password"
                value={passwordForm.confirmPassword}
              />
            </div>

            <SketchButton disabled={busyAction === "password"} type="submit">
              {busyAction === "password" ? "Saving..." : "Save"}
            </SketchButton>
          </form>
        </div>
      </>
    );
  }

  const activeContextDocument =
    contextMenu?.entity === "document"
      ? documents.find((document) => document.id === contextMenu.id)
      : null;
  const activeContextCompany =
    contextMenu?.entity === "company"
      ? companies.find((company) => company.id === contextMenu.id)
      : null;
  const activeContextCategory =
    contextMenu?.entity === "category"
      ? categories.find((category) => category.id === contextMenu.id)
      : null;

  const deleteActionLabel =
    deleteDialog?.entity === "document"
      ? "Delete Document"
      : deleteDialog?.entity === "company"
        ? "Delete Company"
        : "Delete Category";

  const deleteActionMessage =
    deleteDialog?.entity === "document"
      ? `Delete "${deleteDialog.name}" permanently?`
      : deleteDialog?.entity === "company"
        ? `Delete company "${deleteDialog.name}" permanently?`
        : deleteDialog?.entity === "category"
          ? `Delete category "${deleteDialog.name}" permanently?`
          : "";

  const sidebarContent = (
    <>
      <div>
        <div className="mb-6 flex items-center justify-between gap-4 border-b-[3px] border-[var(--sketch-ink)] pb-5">
          <div className="flex items-center gap-4">
            <BrandMark />
            <div>
              <p className="text-4xl leading-none">Doc Tracker</p>
            </div>
          </div>

          <button
            aria-label="Close sidebar"
            className="flex h-11 w-11 items-center justify-center rounded-[16px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.72)] text-3xl shadow-[2px_2px_0_rgba(34,31,28,0.45)] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className="space-y-3">
          {sectionItems.map((item) => (
            <SketchButton
              className="w-full justify-center py-4 text-[2rem]"
              key={item.key}
              onClick={() => moveToSection(item.key)}
              tone={section === item.key ? "active" : "muted"}
            >
              {item.label}
            </SketchButton>
          ))}
        </nav>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <AvatarMark />
        <div className="min-w-0">
          <p className="truncate text-2xl leading-none">{currentUser.name}</p>
          <p className="truncate text-xl text-[var(--sketch-muted)]">
            {currentUser.email}
          </p>
        </div>
      </div>
    </>
  );

  async function confirmDelete() {
    if (!deleteDialog) {
      return;
    }

    const { entity, id } = deleteDialog;
    setDeleteDialog(null);

    if (entity === "document") {
      await handleDeleteDocument(id);
      return;
    }

    if (entity === "company") {
      await handleDeleteCompany(id);
      return;
    }

    await handleDeleteCategory(id);
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-5 md:py-5">
      <div className="mx-auto mb-4 flex max-w-[1880px] items-center justify-between gap-4 lg:hidden">
        <div className="sketch-panel paper-grid flex flex-1 items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <p className="text-3xl leading-none">Doc Tracker</p>
          </div>

          <button
            aria-label="Open sidebar"
            className="flex h-11 w-11 items-center justify-center rounded-[16px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.72)] shadow-[2px_2px_0_rgba(34,31,28,0.45)]"
            onClick={() => setIsMobileSidebarOpen(true)}
            type="button"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-[3px] w-5 rounded-full bg-[var(--sketch-ink)]" />
              <span className="block h-[3px] w-5 rounded-full bg-[var(--sketch-ink)]" />
              <span className="block h-[3px] w-5 rounded-full bg-[var(--sketch-ink)]" />
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1880px] flex-col gap-4 lg:flex-row">
        <aside className="sketch-panel paper-grid hidden w-full flex-col justify-between p-4 lg:flex lg:w-[320px] lg:p-6">
          {sidebarContent}
        </aside>

        <main className="sketch-panel paper-grid flex-1 p-5 md:p-8">
          <NotificationEnrollment />

          {message ? (
            <div className="mb-6">
              <StatusBanner message={message} tone={statusTone} />
            </div>
          ) : null}

          {isLoading ? (
            <div className="text-4xl text-[var(--sketch-muted)]">Loading workspace...</div>
          ) : (
            <>
              {section === "documents" ? renderDocumentsSection() : null}
              {section === "companies" ? renderCompaniesSection() : null}
              {section === "categories" ? renderCategoriesSection() : null}
              {section === "profile" ? renderProfileSection() : null}
            </>
          )}
        </main>
      </div>

      {isMobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[rgba(34,31,28,0.32)] backdrop-blur-[3px] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside
            className="sketch-panel paper-grid absolute right-4 top-4 flex h-[calc(100vh-2rem)] w-[min(320px,calc(100vw-2rem))] flex-col justify-between p-4"
            onClick={(event) => event.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="sketch-context-menu fixed z-40 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="flex w-full rounded-[16px] px-3 py-2 text-left text-xl transition hover:bg-[rgba(89,126,160,0.14)]"
            onClick={() => {
              if (activeContextDocument) {
                openDocumentEditModal(activeContextDocument);
              }

              if (activeContextCompany) {
                openCompanyEditModal(activeContextCompany);
              }

              if (activeContextCategory) {
                openCategoryEditModal(activeContextCategory);
              }

              setContextMenu(null);
            }}
            type="button"
          >
            Edit
          </button>
          <button
            className="flex w-full rounded-[16px] px-3 py-2 text-left text-xl transition hover:bg-[rgba(210,120,120,0.18)]"
            onClick={() => {
              const id = contextMenu.id;
              const entity = contextMenu.entity;
              setContextMenu(null);

              if (entity === "document") {
                setDeleteDialog({
                  entity,
                  id,
                  name: activeContextDocument?.name || "this document",
                });
              }

              if (entity === "company") {
                setDeleteDialog({
                  entity,
                  id,
                  name: activeContextCompany?.name || "this company",
                });
              }

              if (entity === "category") {
                setDeleteDialog({
                  entity,
                  id,
                  name: activeContextCategory?.name || "this category",
                });
              }
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}

      {isDocumentModalOpen ? (
        <ModalShell
          closeOnBackdrop={false}
          onClose={() => setIsDocumentModalOpen(false)}
          title={documentForm.id ? "Edit Document" : "Add Document"}
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleDocumentSubmit}>
            <div className="space-y-2 md:col-span-2">
              <label className="text-2xl" htmlFor="document-name">
                Document Name
              </label>
              <SketchInput
                id="document-name"
                onChange={(event) =>
                  setDocumentForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Document Name"
                value={documentForm.name}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="document-company">
                Select Company
              </label>
              <SketchSelectMenu
                id="document-company"
                onChange={(value) =>
                  setDocumentForm((current) => ({
                    ...current,
                    companyId: value,
                  }))
                }
                options={companies.map((company) => ({
                  label: company.name,
                  value: company.id,
                }))}
                placeholder="Choose company"
                value={documentForm.companyId}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="document-category">
                Select Category
              </label>
              <SketchSelectMenu
                id="document-category"
                onChange={(value) =>
                  setDocumentForm((current) => ({
                    ...current,
                    categoryId: value,
                  }))
                }
                options={categories.map((category) => ({
                  label: category.name,
                  value: category.id,
                }))}
                placeholder="Choose category"
                value={documentForm.categoryId}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="document-expiry">
                Choose Expiry Date
              </label>
              <SketchInput
                id="document-expiry"
                onChange={(event) =>
                  setDocumentForm((current) => ({
                    ...current,
                    expiryDate: event.target.value,
                  }))
                }
                type="date"
                value={documentForm.expiryDate}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="document-reminder">
                Choose Reminder Date &amp; Time
              </label>
              <SketchInput
                id="document-reminder"
                onChange={(event) =>
                  setDocumentForm((current) => ({
                    ...current,
                    reminderAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={documentForm.reminderAt}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-2xl" htmlFor="document-file">
                Upload File (optional)
              </label>
              <SketchInput
                ref={documentFileInputRef}
                id="document-file"
                onChange={(event) =>
                  setDocumentForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] || null,
                  }))
                }
                type="file"
              />

              {documentForm.file ? (
                <div className="relative mt-3 w-full max-w-sm overflow-hidden rounded-[20px] border-[3px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.65)] p-3 shadow-[2px_2px_0_rgba(34,31,28,0.45)]">
                  <button
                    aria-label="Remove selected file"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--sketch-ink)] bg-[rgba(255,255,255,0.95)] text-lg leading-none shadow-[1px_1px_0_rgba(34,31,28,0.45)]"
                    onClick={clearSelectedDocumentFile}
                    type="button"
                  >
                    ×
                  </button>

                  {documentFilePreviewUrl ? (
                    <Image
                      alt={documentForm.file.name}
                      className="mb-3 h-28 w-full rounded-[14px] border-[2px] border-[var(--sketch-ink)] object-cover"
                      height={112}
                      src={documentFilePreviewUrl}
                      unoptimized
                      width={320}
                    />
                  ) : (
                    <div className="mb-3 flex h-28 items-center justify-center rounded-[14px] border-[2px] border-dashed border-[var(--sketch-ink)] bg-[rgba(89,126,160,0.08)] text-5xl">
                      {documentForm.file.type.startsWith("application/pdf")
                        ? "PDF"
                        : "FILE"}
                    </div>
                  )}

                  <div className="pr-8">
                    <p className="truncate text-xl leading-none">{documentForm.file.name}</p>
                    <p className="mt-2 text-lg text-[var(--sketch-muted)]">
                      {documentForm.file.type || "Unknown type"} •{" "}
                      {formatFileSize(documentForm.file.size)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 pt-2 md:col-span-2">
              <SketchButton disabled={busyAction === "document"} type="submit">
                {busyAction === "document"
                  ? "Saving..."
                  : documentForm.id
                    ? "Save Changes"
                    : "Add Document"}
              </SketchButton>
              <SketchButton
                onClick={() => setIsDocumentModalOpen(false)}
                tone="muted"
              >
                Cancel
              </SketchButton>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {deleteDialog ? (
        <ModalShell
          closeOnBackdrop={false}
          onClose={() => setDeleteDialog(null)}
          title={deleteActionLabel}
        >
          <div className="space-y-5">
            <p className="text-2xl leading-snug">{deleteActionMessage}</p>
            <p className="text-xl text-[var(--sketch-muted)]">
              This action cannot be undone.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <SketchButton
                disabled={busyAction.startsWith("delete-")}
                onClick={() => void confirmDelete()}
                tone="danger"
              >
                {busyAction.startsWith("delete-") ? "Deleting..." : "Confirm Delete"}
              </SketchButton>
              <SketchButton onClick={() => setDeleteDialog(null)} tone="muted">
                Cancel
              </SketchButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {isCompanyModalOpen ? (
        <ModalShell
          onClose={() => setIsCompanyModalOpen(false)}
          title={companyForm.id ? "Edit Company" : "Add Company"}
        >
          <form className="space-y-5" onSubmit={handleCompanySubmit}>
            <div className="space-y-2">
              <label className="text-2xl" htmlFor="company-name">
                Company Name
              </label>
              <SketchInput
                id="company-name"
                onChange={(event) =>
                  setCompanyForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Company Name"
                value={companyForm.name}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="company-email">
                Company Email
              </label>
              <SketchInput
                id="company-email"
                onChange={(event) =>
                  setCompanyForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="companymail@gmail.com"
                type="email"
                value={companyForm.email}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <SketchButton disabled={busyAction === "company"} type="submit">
                {busyAction === "company"
                  ? "Saving..."
                  : companyForm.id
                    ? "Save Changes"
                    : "Add Company"}
              </SketchButton>
              <SketchButton
                onClick={() => setIsCompanyModalOpen(false)}
                tone="muted"
              >
                Cancel
              </SketchButton>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isCategoryModalOpen ? (
        <ModalShell
          onClose={() => setIsCategoryModalOpen(false)}
          title={categoryForm.id ? "Edit Category" : "Add Category"}
        >
          <form className="space-y-5" onSubmit={handleCategorySubmit}>
            <div className="space-y-2">
              <label className="text-2xl" htmlFor="category-name">
                Category Name
              </label>
              <SketchInput
                id="category-name"
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Category Name"
                value={categoryForm.name}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <SketchButton disabled={busyAction === "category"} type="submit">
                {busyAction === "category"
                  ? "Saving..."
                  : categoryForm.id
                    ? "Save Changes"
                    : "Add Category"}
              </SketchButton>
              <SketchButton
                onClick={() => setIsCategoryModalOpen(false)}
                tone="muted"
              >
                Cancel
              </SketchButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

function SectionHeader({
  action,
  title,
}: {
  action?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <h1 className="text-5xl leading-none md:text-6xl">{title}</h1>
      {action}
    </div>
  );
}
