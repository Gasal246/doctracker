import { notFound, redirect } from "next/navigation";

import { DashboardApp } from "@/components/dashboard-app";
import { getCurrentUser } from "@/lib/auth";

const validSections = ["documents", "companies", "categories", "profile"] as const;

type RouteProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function DashboardSectionPage({ params }: RouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { section } = await params;

  if (!validSections.includes(section as (typeof validSections)[number])) {
    notFound();
  }

  return (
    <DashboardApp
      initialSection={section as "documents" | "companies" | "categories" | "profile"}
      user={user}
    />
  );
}
