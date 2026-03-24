import { model, models, Schema, type InferSchemaType } from "mongoose";

const adminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: "",
      trim: true,
    },
    passwordHash: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      default: "Administrator",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type AdminDocument = InferSchemaType<typeof adminSchema> & {
  _id: string;
};

export const AdminModel = models.Admin || model("Admin", adminSchema);
