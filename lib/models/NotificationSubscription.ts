import { model, models, Schema, type InferSchemaType, Types } from "mongoose";

const notificationSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      default: "web",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

notificationSubscriptionSchema.index({ userId: 1, token: 1 }, { unique: true });

export type NotificationSubscriptionDocument = InferSchemaType<
  typeof notificationSubscriptionSchema
> & {
  _id: Types.ObjectId;
};

export const NotificationSubscriptionModel =
  models.NotificationSubscription ||
  model("NotificationSubscription", notificationSubscriptionSchema);
