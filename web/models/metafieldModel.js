import mongoose, { Schema } from "mongoose";

const metafieldSchema = new Schema(
  {
    metafieldId: { type: String, required: true },
    value: { type: String, require: true },
    namespace: { type: String },
    key: { type: String },
    type: { type: String },
    ownerId: { type: String },
    ownerResource: { type: String },
  },
  {
    timestamps: true,
  }
);

metafieldSchema.index({ metafieldId: 1 }, { unique: true });

export default mongoose.model("Metafield", metafieldSchema, "metafields");
