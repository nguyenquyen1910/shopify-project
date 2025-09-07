import mongoose, { Schema } from "mongoose";

const storeSchema = new Schema(
  {
    shopId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    shop: { type: String, required: true },
    domain: { type: String, required: true },
    currencyCode: { type: String, required: true },
    primaryDomain: {
      host: { type: String, required: true },
      url: { type: String, required: true },
      sslEnabled: { type: Boolean, required: true },
    },
    accessToken: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerEmail: { type: String, required: true },
    ownerPhone: { type: String, required: true },
    address: {
      address1: { type: String, default: "" },
      address2: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      country: { type: String, default: "" },
      zip: { type: String, default: "" },
    },
    planName: { type: String, required: true },
    planType: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Store", storeSchema, "stores");
