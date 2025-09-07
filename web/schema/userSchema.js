import { gql } from "apollo-server-express";

export const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    roles: [String!]!
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  input CreateUserInput {
    email: String!
    password: String!
    roles: [String!]!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    me: User
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
  }
`;
