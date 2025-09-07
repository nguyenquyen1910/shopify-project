import User from "../models/userModel.js";
import { generateToken } from "../utils/jwt.js";

const userResolvers = {
  Query: {
    users: async (_, __, { user }) => {
      if (!user || !user.roles.includes("admin"))
        throw new Error("Unauthorized");
      return await User.find({}).select("-password");
    },

    user: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await User.findById(id).select("-password");
    },

    me: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await User.findById(user.id).select("-password");
    },
  },

  Mutation: {
    createUser: async (_, { input }, { user }) => {
      if (!user || !user.roles.includes("admin"))
        throw new Error("Unauthorized");
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) throw new Error("User already exists");
      const newUser = new User(input);
      const savedUser = await newUser.save();

      return {
        ...savedUser.toObject(),
        password: undefined,
      };
    },

    login: async (_, { input }) => {
      const { email, password } = input;
      const user = await User.findOne({ email });
      if (!user) throw new Error("Invalid credentials");
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) throw new Error("Invalid credentials");
      user.lastLogin = new Date();

      const token = generateToken({
        id: user._id,
        email: user.email,
        roles: user.roles,
      });

      return {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          roles: user.roles,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    },

    logout: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return true;
    },
  },
};

export default userResolvers;
