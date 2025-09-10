import OptimizedImage from "../models/optimizedImageModel.js";
import Store from "../models/storeModel.js";
import {
  createGraphqlClient,
  getProductImages,
  uploadOptimizedImage,
  setOptimizedMapMetafield,
} from "../utils/shopifyAdmin.js";

const resolveShopifyContextFromDb = async ({ user }, storeId) => {
  if (!user) throw new Error("Unauthorized");

  let store = null;
  if (storeId) {
    store = await Store.findOne({ _id: storeId, ownerUserId: user.id }).lean();
    if (!store) throw new Error("Invalid storeId");
  } else {
    store = await Store.findOne({ ownerUserId: user.id }).lean();
    if (!store) throw new Error("Store not found for user");
  }

  const shop = store.shop;
  const accessToken = store.accessToken;
  if (!shop || !accessToken) throw new Error("Missing shop credentials");
  return { shop, accessToken, storeId: store._id, store };
};

const getShopifyContext = (context) => {
  const shop = context?.shop || context?.shopify?.shop;
  const accessToken = context?.accessToken || context?.user?.accessToken;
  if (!shop || !accessToken) throw new Error("Unauthorized");
  return { shop, accessToken };
};

const optimizedImageResolvers = {
  Query: {
    listOptimizedImages: async (_, { storeId, search }, context) => {
      // Get optimized images in DB
      if (!context?.user && !context?.shop) throw new Error("Unauthorized");
      if (!storeId) throw new Error("Unauthorized: storeId is required");
      const filter = { storeId };
      if (search && search.trim()) {
        filter.originalUrl = { $regex: search.trim(), $options: "i" };
      }
      const items = await OptimizedImage.find(filter)
        .sort({ updatedAt: -1 })
        .lean();
      return items;
    },
    listShopifyImages: async (_, { first = 50, after, storeId }, context) => {
      const { shop, accessToken } = await resolveShopifyContextFromDb(
        context,
        storeId
      );
      const client = createGraphqlClient({ shop, accessToken });
      return getProductImages(client, { first, after });
    },
  },

  Mutation: {
    saveOptimizedImages: async (_, { storeId, inputs }, context) => {
      // Get optimized images from FE, upload to Shopify, save to DB
      if (!Array.isArray(inputs) || inputs.length === 0)
        throw new Error("Invalid inputs");
      const { shop, accessToken } = await resolveShopifyContextFromDb(
        context,
        storeId
      );
      const client = createGraphqlClient({ shop, accessToken });
      const store = await Store.findById(storeId);
      if (!store) throw new Error("Store not found in optimizedImageResolver");
      const results = [];
      for (const input of inputs) {
        const {
          originalUrl,
          optimizedUrl,
          mimeType,
          width,
          height,
          sizeBytes,
        } = input;
        let finalOptimizedUrl = optimizedUrl;
        // const isDataUrl =
        //   typeof optimizedUrl === "string" && optimizedUrl.startsWith("data:");
        // if (isDataUrl) {
        //   const uploaded = await uploadOptimizedImage(client, {
        //     name: "optimized-image.webp",
        //     contentType: mimeType || "image/webp",
        //     dataUrl: optimizedUrl,
        //   });
        //   finalOptimizedUrl = uploaded.url;
        //   console.log(
        //     "finalOptimizedUrl in optimizedImageResolver",
        //     finalOptimizedUrl
        //   );
        // }
        // Compression ratio calculation
        const doc = await OptimizedImage.findOneAndUpdate(
          { storeId, originalUrl },
          {
            shopId: store.shopId,
            optimizedUrl: finalOptimizedUrl,
            mimeType: mimeType || "image/webp",
            width,
            height,
            sizeBytes: sizeBytes ?? null,
            compressionRatio: null,
            status: "optimized",
            lastSyncAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(doc.toObject());
      }
      return results;
    },

    pushOptimizedToShopify: async (_, { storeId }, context) => {
      // Đẩy mapping lên metafield
      const { shop, accessToken } = getShopifyContext(context);
      const client = createGraphqlClient({ shop, accessToken });
      const items = await OptimizedImage.find({ storeId }).lean();
      if (!items.length) {
        return { updated: 0 };
      }
      const mapping = {};
      for (const it of items) {
        mapping[it.originalUrl] = it.optimizedUrl;
      }
      const valueJson = JSON.stringify(mapping);
      await setOptimizedMapMetafield(client, {
        namespace: "tapita.optimize",
        key: "image_map",
        valueJson,
      });
      await OptimizedImage.updateMany(
        { storeId },
        { $set: { status: "pushed", lastSyncAt: new Date() } }
      );
      return { updated: items.length };
    },
  },
};

export default optimizedImageResolvers;
