import { model, models, Schema, type InferSchemaType, Types } from "mongoose";

const companySchema = new Schema(
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
    email: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

companySchema.index({ userId: 1, name: 1 });

export type CompanyDocument = InferSchemaType<typeof companySchema> & {
  _id: Types.ObjectId;
};

export const CompanyModel = models.Company || model("Company", companySchema);
