import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, getStringValue, normalizeEmail } from "@/lib/http";
import { UserModel } from "@/lib/models/User";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as Record<string, unknown>;
  const name = getStringValue(body, "name");
  const email = normalizeEmail(getStringValue(body, "email"));

  if (!name || !email) {
    return errorResponse("Name and email are required.");
  }

  const existingUser = await UserModel.findOne({
    email,
    _id: { $ne: user.id },
  }).lean();

  if (existingUser) {
    return errorResponse("This email is already in use.");
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    user.id,
    { name, email },
    { new: true },
  ).lean();

  if (!updatedUser) {
    return errorResponse("User not found.", 404);
  }

  return Response.json({
    success: true,
    user: {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
    },
  });
}
