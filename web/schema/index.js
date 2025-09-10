import { storeTypeDefs } from "./storeSchema.js";
import { userTypeDefs } from "./userSchema.js";
import { optimizedImageTypeDefs } from "./optimizedImageSchema.js";
import { gql } from "apollo-server-express";

export const typeDefs = [
  gql`
    scalar JSON
  `,
  userTypeDefs,
  storeTypeDefs,
  optimizedImageTypeDefs,
];
