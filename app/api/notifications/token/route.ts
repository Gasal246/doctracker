import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { NotificationSubscriptionModel } from "@/lib/models/NotificationSubscription";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as {
    platform?: string;
    token?: string;
    userAgent?: string;
  };
  const token = body.token?.trim() || "";

  if (!token) {
    return errorResponse("Notification token is required.");
  }

  await NotificationSubscriptionModel.findOneAndUpdate(
    { token },
    {
      userId: user.id,
      token,
      platform: body.platform?.trim() || "web",
      userAgent: body.userAgent?.trim() || "",
      lastSeenAt: new Date(),
    },
    { new: true, upsert: true },
  );

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  await connectToDatabase();

  const body = (await request.json()) as {
    token?: string;
  };
  const token = body.token?.trim() || "";

  if (!token) {
    return errorResponse("Notification token is required.");
  }

  await NotificationSubscriptionModel.deleteOne({
    token,
    userId: user.id,
  });

  return Response.json({ success: true });
}
