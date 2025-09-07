import { gql } from "apollo-server-express";

export const storeTypeDefs = gql`
  type Store {
    id: ID!
    shopId: String!
    name: String!
    email: String!
    shop: String!
    domain: String!
    currencyCode: String!
    primaryDomain: PrimaryDomain!
    accessToken: String!
    ownerUserId: User!
    ownerEmail: String!
    ownerPhone: String!
    address: Address!
    planName: String!
    planType: String!
    createdAt: String!
    updatedAt: String!
  }

  type PrimaryDomain {
    host: String!
    url: String!
    sslEnabled: Boolean!
  }

  type Address {
    address1: String!
    address2: String!
    city: String!
    province: String!
    country: String!
    zip: String!
  }

  extend type Query {
    getMyStores: [Store]
  }

  extend type Mutation {
    syncStore: Store!
  }
`;
