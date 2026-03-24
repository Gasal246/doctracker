import { model, models, Schema, type InferSchemaType, Types } from "mongoose";

const documentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    reminderAt: {
      type: Date,
      required: true,
    },
    reminderProcessedAt: {
      type: Date,
      default: null,
    },
    reminderEmailSentAt: {
      type: Date,
      default: null,
    },
    reminderPushSentAt: {
      type: Date,
      default: null,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    filePath: {
      type: String,
      default: "",
      trim: true,
    },
    fileType: {
      type: String,
      default: "FILE",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

documentSchema.index({ userId: 1, expiryDate: 1 });
documentSchema.index({ userId: 1, companyId: 1, categoryId: 1 });
documentSchema.index({ reminderAt: 1, reminderProcessedAt: 1 });

export type DocumentDocument = InferSchemaType<typeof documentSchema> & {
  _id: Types.ObjectId;
};

export const DocumentModel = models.Document || model("Document", documentSchema);
