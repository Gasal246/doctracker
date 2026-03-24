import { redirect } from "next/navigation";

import { AdminUsersPanel } from "@/components/admin-users-panel";
import { getCurrentAdmin } from "@/lib/auth";

export default async function AdminUsersPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return <AdminUsersPanel admin={admin} />;
}
