import mongoose from "mongoose";

const optimizedImageSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Types.ObjectId, ref: "Store", index: true },
    shopId: { type: String, index: true },
    originalUrl: { type: String, required: true },
    optimizedUrl: { type: String, required: true },
    mimeType: { type: String },
    width: { type: Number },
    height: { type: Number },
    sizeBytes: { type: Number },
    compressionRatio: { type: Number },
    status: {
      type: String,
      enum: ["optimized", "pushed"],
      default: "optimized",
      index: true,
    },
    lastSyncAt: { type: Date },
  },
  {
    timestamps: true,
  }
);
optimizedImageSchema.virtual("id").get(function () {
  return this._id.toString();
});

optimizedImageSchema.set("toObject", { virtuals: true });
optimizedImageSchema.set("toJSON", { virtuals: true });

optimizedImageSchema.index({ storeId: 1, originalUrl: 1 }, { unique: true });

const OptimizedImage = mongoose.model("OptimizedImage", optimizedImageSchema);
export default OptimizedImage;
