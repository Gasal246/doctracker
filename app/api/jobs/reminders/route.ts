import { getEnv } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { runReminderDispatch } from "@/lib/reminders";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedValue = `Bearer ${getEnv("REMINDER_CRON_SECRET")}`;

  if (authHeader !== expectedValue) {
    return errorResponse("Unauthorized.", 401);
  }

  try {
    const result = await runReminderDispatch();

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Reminder job failed", error);

    return errorResponse(
      error instanceof Error ? error.message : "Reminder job failed.",
      500,
    );
  }
}
