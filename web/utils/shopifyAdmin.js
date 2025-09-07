import shopify from "../shopify";

export const createGraphqlClient = ({ shop, accessToken }) =>
  new shopify.api.clients.Graphql({ session: { shop, accessToken } });
