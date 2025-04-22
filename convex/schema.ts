import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  images: defineTable({
    storageId: v.id("_storage"),
    authorId: v.id("users"),
    description: v.optional(v.string()),
  }).index("by_author", ["authorId"]),
  
  likes: defineTable({
    imageId: v.id("images"),
    userId: v.id("users"),
  })
    .index("by_image", ["imageId"])
    .index("by_user_and_image", ["userId", "imageId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
