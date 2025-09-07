// @ts-check
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import { ApolloServer } from "apollo-server-express";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import connectDatabase from "./configs/dbSample.js";
import Store from "./models/storeModel.js";
import Metafield from "./models/metafieldModel.js";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import { verifyToken } from "./utils/jwt.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

console.log("PORT", PORT);

const FRONTEND_DIR = `${process.cwd()}/frontend/`;
const FRONTEND_DIST_DIR = `${process.cwd()}/frontend/dist`;
const STATIC_PATH = existsSync(FRONTEND_DIST_DIR)
  ? FRONTEND_DIST_DIR
  : FRONTEND_DIR;

const app = express();
await connectDatabase();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      try {
        const decoded = verifyToken(token);
        return {
          user: decoded,
        };
      } catch (error) {
        return {
          user: null,
        };
      }
    }

    return {
      user: null,
    };
  },

  formatError: (error) => {
    return {
      message: error.message,
      code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
    };
  },
});

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// Start Apollo Server
await server.start();
server.applyMiddleware({ app, path: "/graphql" });

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.get("/api/shop", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });
    const accessToken = res.locals.shopify.session.accessToken;

    const { data } = await client.request(`
      query ShopDetailedInfo {
        shop {
          id
          name
          email
          contactEmail
          myshopifyDomain
          currencyCode
          plan {
            displayName
            partnerDevelopment
            shopifyPlus
          }
          billingAddress {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          primaryDomain {
            url
            host
            sslEnabled
          }
        }
      }
    `);

    const shop = data?.shop;

    const payload = {
      shopId: shop.id,
      name: shop.name,
      email: shop.email,
      shop: shop.myshopifyDomain,
      domain: shop.primaryDomain?.host,
      currencyCode: shop.currencyCode,
      primaryDomain: {
        url: shop.primaryDomain?.url,
        host: shop.primaryDomain?.host,
        sslEnabled: shop.primaryDomain?.sslEnabled,
      },
      ownerId: res.locals.shopify.session.shop,
      accessToken: accessToken,
      ownerEmail: shop.contactEmail,
      ownerPhone: shop.billingAddress?.phone || "",
      address: shop.billingAddress
        ? {
            address1: shop.billingAddress.address1 || "",
            address2: shop.billingAddress.address2 || "",
            city: shop.billingAddress.city || "",
            province: shop.billingAddress.province || "",
            country: shop.billingAddress.country || "",
            zip: shop.billingAddress.zip || "",
          }
        : {},
      planName: shop.plan?.displayName || "Unknown",
      planType: shop.plan?.partnerDevelopment
        ? "Development"
        : shop.plan?.shopifyPlus
        ? "Shopify Plus"
        : "Standard",
    };

    console.log("Payload for DB:", payload);

    try {
      const store = await Store.findOneAndUpdate({ shopId: shop.id }, payload, {
        new: true,
        upsert: true,
      });
      console.log("Store updated", store);
    } catch (e) {
      console.log("Error", e);
    }

    res.status(200).send(data.shop);
  } catch (e) {
    console.log("Error", e);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.post("/api/metafields", async (_req, res) => {
  try {
    const { value } = _req.body;
    const session = res.locals.shopify.session;

    if (!value) {
      res.status(400).send({ error: "Value is required" });
      return;
    }

    const metafield = new shopify.api.rest.Metafield({ session });
    metafield.product_id = 7405788659810;
    metafield.owner_resource = "product";
    metafield.namespace = "custom";
    metafield.key = "made_in";
    metafield.type = "single_line_text_field";
    metafield.value = value;

    await metafield.save({ update: true });

    const metafieldDoc = new Metafield({
      ownerId: metafield?.owner_id?.toString(),
      metafieldId: metafield?.id?.toString(),
      value,
      namespace: "custom",
      key: "made_in",
      type: "single_line_text_field",
      ownerResource: "product",
    });
    await metafieldDoc.save();

    res.status(201).json({
      success: true,
      message: "Metafield created successfully",
    });
  } catch (e) {
    console.log("Error", e);
    res.status(500).json({
      error: e.message,
    });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.get("/login", async (_req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.use("/*", async (_req, res, _next) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
