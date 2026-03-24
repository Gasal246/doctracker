import { comparePassword, getCurrentUser, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue } from "@/lib/http";
import { UserModel } from "@/lib/models/User";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const currentPassword = getStringValue(body, "currentPassword");
  const newPassword = getStringValue(body, "newPassword");
  const confirmPassword = getStringValue(body, "confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return errorResponse("All password fields are required.");
  }

  if (newPassword.length < 6) {
    return errorResponse("New password must be at least 6 characters long.");
  }

  if (newPassword !== confirmPassword) {
    return errorResponse("Password confirmation does not match.");
  }

  const existingUser = await UserModel.findById(user.id);

  if (!existingUser) {
    return errorResponse("User not found.", 404);
  }

  const isValid = await comparePassword(
    currentPassword,
    existingUser.passwordHash,
  );

  if (!isValid) {
    return errorResponse("Current password is incorrect.", 401);
  }

  existingUser.passwordHash = await hashPassword(newPassword);
  await existingUser.save();

  return Response.json({ success: true });
}
