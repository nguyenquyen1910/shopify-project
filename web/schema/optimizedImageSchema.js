import { gql } from "apollo-server-express";

export const optimizedImageTypeDefs = gql`
  type OptimizedImage {
    id: ID!
    storeId: ID!
    shopId: String!
    originalUrl: String!
    optimizedUrl: String!
    mimeType: String
    width: Int
    height: Int
    sizeBytes: Int
    compressionRatio: Float
    status: String
    createdAt: String
    updatedAt: String
  }

  input OptimizedImageInput {
    originalUrl: String!
    optimizedUrl: String!
    mimeType: String!
    width: Int
    height: Int
    sizeBytes: Int
  }

  type OptimizedPushResult {
    updated: Int!
  }

  extend type Query {
    listOptimizedImages(storeId: ID!, search: String): [OptimizedImage!]!
    listShopifyImages(first: Int, after: String, storeId: ID): JSON
  }

  extend type Mutation {
    saveOptimizedImages(
      storeId: ID!
      inputs: [OptimizedImageInput!]!
    ): [OptimizedImage!]!
    pushOptimizedToShopify(storeId: ID!): OptimizedPushResult!
  }
`;
