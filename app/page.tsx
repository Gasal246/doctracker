import { redirect } from "next/navigation";

import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const [admin, user] = await Promise.all([getCurrentAdmin(), getCurrentUser()]);

  if (admin) {
    redirect("/admin/users");
  }

  if (user) {
    redirect("/dashboard/documents");
  }

  redirect("/login");
}
