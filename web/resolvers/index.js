import userResolvers from "./userResolver.js";
import storeResolvers from "./storeResolver.js";
import optimizedImageResolvers from "./optimizedImageResolver.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...storeResolvers.Query,
    ...optimizedImageResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...storeResolvers.Mutation,
    ...optimizedImageResolvers.Mutation,
  },
};
