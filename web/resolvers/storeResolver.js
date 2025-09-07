import Store from "../models/storeModel.js";
import shopify from "../shopify.js";

const storeResolvers = {
  Query: {
    getMyStores: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const userId = user.id;
      const stores = await Store.find({ ownerUserId: userId });
      return stores;
    },
  },
  Mutation: {
    syncStore: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const userId = user.id;

      const store = await Store.findOne({ ownerUserId: userId });
      if (!store) throw new Error("Store not found");

      try {
        const shopifyClient = new shopify.api.clients.Graphql({
          session: {
            accessToken: store.accessToken,
            shop: store.shop,
          },
        });

        const { data } = await shopifyClient.request(`
            query ShopInfo {
            shop {
              name
              email
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
        const updatedStore = await Store.findByIdAndUpdate(
          store._id,
          {
            name: shop.name,
            email: shop.email,
            domain: shop.primaryDomain?.host,
            currencyCode: shop.currencyCode,
            primaryDomain: {
              host: shop.primaryDomain?.host,
              url: shop.primaryDomain?.url,
              sslEnabled: shop.primaryDomain?.sslEnabled,
            },
            ownerPhone: shop.billingAddress?.phone || store.ownerPhone,
            address: {
              address1: shop.billingAddress?.address1 || "",
              address2: shop.billingAddress?.address2 || "",
              city: shop.billingAddress?.city || "",
              province: shop.billingAddress?.province || "",
              country: shop.billingAddress?.country || "",
              zip: shop.billingAddress?.zip || "",
            },
            planName: shop.plan?.displayName || store.planName,
            planType: shop.plan?.partnerDevelopment
              ? "Development"
              : shop.plan?.shopifyPlus
              ? "Shopify Plus"
              : "Standard",
            updatedAt: new Date(),
          },
          { new: true }
        );
        return updatedStore;
      } catch (error) {
        console.error("Error syncing store:", error);
        throw new Error("Failed to sync store");
      }
    },
  },
};

export default storeResolvers;
