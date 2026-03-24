"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminUserDto, SessionUser } from "@/lib/types";
import {
  BrandMark,
  ModalShell,
  SketchButton,
  SketchCard,
  SketchInput,
  StatusBanner,
} from "@/components/sketch-ui";

type UserFormState = {
  name: string;
  email: string;
  password: string;
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
};

export function AdminUsersPanel({ admin }: { admin: SessionUser }) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users");
      const data = (await response.json()) as {
        error?: string;
        users?: AdminUserDto[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load users.");
      }

      setUsers(data.users || []);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        user?: AdminUserDto;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Unable to create user.");
      }

      setUsers((current) => [data.user!, ...current]);
      setForm(emptyForm);
      setIsModalOpen(false);
      setMessage("User created successfully.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to create user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="sketch-panel paper-grid min-h-[calc(100vh-3rem)] p-5 md:p-7">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <p className="text-4xl leading-none">Doc Tracker Admin</p>
                <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                  {admin.email}
                </p>
              </div>
            </div>
            <h1 className="text-5xl leading-none">Users Panel</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <SketchButton onClick={() => setIsModalOpen(true)}>
              + Add User
            </SketchButton>
            <SketchButton onClick={handleSignOut} tone="danger">
              Sign Out
            </SketchButton>
          </div>
        </div>

        <div className="mb-6 flex max-w-2xl flex-col gap-4">
          <SketchInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search users"
            value={search}
          />
          {message ? (
            <StatusBanner message={message} tone={isError ? "danger" : "primary"} />
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-3xl text-[var(--sketch-muted)]">Loading users...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <SketchCard className="space-y-3 p-5" key={user.id}>
                <div>
                  <p className="text-3xl leading-none">{user.name}</p>
                  <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                    {user.email}
                  </p>
                </div>
                <div className="sketch-badge w-fit">
                  Created {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </SketchCard>
            ))}

            {!filteredUsers.length ? (
              <SketchCard className="p-5">
                <p className="text-3xl leading-none">No users found</p>
                <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                  Create the first user from the button above.
                </p>
              </SketchCard>
            ) : null}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <ModalShell onClose={() => setIsModalOpen(false)} title="Create User">
          <form className="space-y-5" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <label className="text-2xl" htmlFor="user-name">
                Name
              </label>
              <SketchInput
                id="user-name"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Muhammed Gasal"
                value={form.name}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="user-email">
                Email
              </label>
              <SketchInput
                id="user-email"
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="user@email.com"
                type="email"
                value={form.email}
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xl" htmlFor="user-password">
                Password
              </label>
              <SketchInput
                id="user-password"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Initial password"
                type="password"
                value={form.password}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <SketchButton disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create User"}
              </SketchButton>
              <SketchButton onClick={() => setIsModalOpen(false)} tone="muted">
                Cancel
              </SketchButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
