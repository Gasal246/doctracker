"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import {
  AvatarMark,
  BrandMark,
  SketchButton,
  SketchInput,
  StatusBanner,
} from "@/components/sketch-ui";

type LoginVariant = "admin" | "user";

export function LoginForm({ variant }: { variant: LoginVariant }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = variant === "admin";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(
        isAdmin ? "/api/auth/admin/login" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
      );
      const raw = await response.text();
      let data: { error?: string } = {};

      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          data = {
            error: raw,
          };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in.");
      }

      startTransition(() => {
        router.push(isAdmin ? "/admin/users" : "/dashboard/documents");
        router.refresh();
      });
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="sketch-panel paper-grid flex w-full max-w-5xl flex-col overflow-hidden md:min-h-[700px] md:flex-row">
        <aside className="flex w-full flex-col justify-between border-b-[3px] border-[var(--sketch-ink)] p-6 md:w-[360px] md:border-b-0 md:border-r-[3px] md:p-8">
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <p className="text-4xl leading-none">Doc Tracker</p>
                <p className="mt-2 text-xl text-[var(--sketch-muted)]">
                  Document expiry tracking
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl leading-none">
                {isAdmin ? "Admin Login" : "User Login"}
              </h1>
              <p className="max-w-sm text-2xl leading-snug text-[var(--sketch-muted)]">
                {isAdmin
                  ? "Use the admin record you add directly to MongoDB to create application users."
                  : "Sign in with the email and password created by your admin."}
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <AvatarMark />
            <div className="text-xl leading-tight text-[var(--sketch-muted)]">
              <p>Sketch-themed workspace</p>
              <p>MGC</p>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-xl">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="block text-2xl" htmlFor="email">
                  Email
                </label>
                <SketchInput
                  autoComplete="email"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-2xl" htmlFor="password">
                  Password
                </label>
                <SketchInput
                  autoComplete={isAdmin ? "current-password" : "current-password"}
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                />
              </div>

              {message ? (
                <StatusBanner message={message} tone={isError ? "danger" : "primary"} />
              ) : null}

              <div className="flex flex-wrap items-center gap-4">
                <SketchButton disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </SketchButton>

                <Link
                  className="text-xl underline decoration-[3px] underline-offset-4"
                  href={isAdmin ? "/login" : "/admin/login"}
                >
                  {isAdmin ? "Open user login" : "Open admin login"}
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
