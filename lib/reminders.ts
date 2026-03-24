import { getOptionalEnv } from "@/lib/env";
import { sendReminderEmail } from "@/lib/email";
import { getFirebaseMessagingService } from "@/lib/firebase-admin";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/lib/models/Document";
import { NotificationSubscriptionModel } from "@/lib/models/NotificationSubscription";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date) {
  return value.toLocaleString(undefined, {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function runReminderDispatch() {
  await connectToDatabase();

  const now = new Date();
  const baseUrl =
    getOptionalEnv("APP_BASE_URL").replace(/\/$/, "") || "http://localhost:3000";
  const dueDocuments = await DocumentModel.find({
    reminderAt: { $lte: now },
    reminderProcessedAt: null,
  })
    .populate("companyId", "name email")
    .populate("userId", "name email")
    .sort({ reminderAt: 1 })
    .limit(100)
    .lean();

  const messaging = getFirebaseMessagingService();
  const results = {
    documentsChecked: dueDocuments.length,
    emailsSent: 0,
    pushSent: 0,
    processed: 0,
  };

  for (const document of dueDocuments) {
    const company = document.companyId as {
      email?: string;
      name?: string;
    };
    const user = document.userId as {
      _id: { toString: () => string };
      name?: string;
    };
    const companyEmail = company?.email?.trim() || "";
    const expiryDateText = formatDate(document.expiryDate);
    const reminderAtText = formatDateTime(document.reminderAt);
    let emailSent = false;
    let pushSent = false;

    if (companyEmail) {
      await sendReminderEmail({
        companyEmail,
        companyName: company?.name || "there",
        documentName: document.name,
        expiryDate: expiryDateText,
        reminderAt: reminderAtText,
      });
      emailSent = true;
      results.emailsSent += 1;
    }

    const subscriptions = await NotificationSubscriptionModel.find({
      userId: user._id.toString(),
    }).lean();
    const tokens = subscriptions.map((subscription) => subscription.token).filter(Boolean);

    if (tokens.length > 0) {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: `Reminder: ${document.name}`,
          body: `${company?.name || "Company"} • expires ${expiryDateText}`,
        },
        data: {
          documentId: document._id.toString(),
          url: `${baseUrl}/dashboard/documents`,
        },
        webpush: {
          fcmOptions: {
            link: `${baseUrl}/dashboard/documents`,
          },
          notification: {
            badge: `${baseUrl}/favicon-32x32.png`,
            icon: `${baseUrl}/android-chrome-192x192.png`,
          },
        },
      });

      pushSent = response.successCount > 0;
      results.pushSent += response.successCount;

      const invalidTokens = response.responses
        .map((item, index) =>
          item.success
            ? null
            : {
                code: item.error?.code || "",
                token: tokens[index],
              },
        )
        .filter((item): item is { code: string; token: string } => item !== null)
        .filter(
          (item) =>
            item.code === "messaging/registration-token-not-registered" ||
            item.code === "messaging/invalid-registration-token",
        )
        .map((item) => item.token);

      if (invalidTokens.length > 0) {
        await NotificationSubscriptionModel.deleteMany({
          token: { $in: invalidTokens },
        });
      }
    }

    await DocumentModel.findByIdAndUpdate(document._id, {
      reminderProcessedAt: now,
      reminderEmailSentAt: emailSent ? now : null,
      reminderPushSentAt: pushSent ? now : null,
    });
    results.processed += 1;
  }

  return results;
}
