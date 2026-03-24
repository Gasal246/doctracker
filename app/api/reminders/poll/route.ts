import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { runReminderDispatch } from "@/lib/reminders";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Unauthorized.", 401);
  }

  try {
    const result = await runReminderDispatch();

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Reminder poll failed", error);

    return errorResponse(
      error instanceof Error ? error.message : "Reminder poll failed.",
      500,
    );
  }
}
