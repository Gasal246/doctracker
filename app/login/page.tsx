import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const [admin, user] = await Promise.all([getCurrentAdmin(), getCurrentUser()]);

  if (admin) {
    redirect("/admin/users");
  }

  if (user) {
    redirect("/dashboard/documents");
  }

  return <LoginForm variant="user" />;
}
