import userResolvers from "./userResolver.js";
import storeResolvers from "./storeResolver.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...storeResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...storeResolvers.Mutation,
  },
};
