import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    return await ctx.db.insert("images", {
      storageId: args.storageId,
      authorId: userId,
    });
  },
});

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").order("desc").collect();
    
    return await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        const likes = await ctx.db
          .query("likes")
          .withIndex("by_image", (q) => q.eq("imageId", image._id))
          .collect();
        
        return {
          ...image,
          url,
          likes: likes.length,
        };
      })
    );
  },
});

export const listMyImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const images = await ctx.db
      .query("images")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .collect();
    
    return await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        const likes = await ctx.db
          .query("likes")
          .withIndex("by_image", (q) => q.eq("imageId", image._id))
          .collect();
        
        return {
          ...image,
          url,
          likes: likes.length,
        };
      })
    );
  },
});

export const deleteImage = mutation({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const image = await ctx.db.get(args.imageId);
    if (!image) throw new Error("Image not found");
    if (image.authorId !== userId) throw new Error("Not authorized");
    
    await ctx.db.delete(args.imageId);
    await ctx.storage.delete(image.storageId);
    
    // Delete associated likes
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_image", (q) => q.eq("imageId", args.imageId))
      .collect();
    
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }
  },
});

export const toggleLike = mutation({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_image", (q) =>
        q.eq("userId", userId).eq("imageId", args.imageId)
      )
      .unique();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("likes", {
        imageId: args.imageId,
        userId,
      });
    }
  },
});

export const isLiked = query({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_image", (q) =>
        q.eq("userId", userId).eq("imageId", args.imageId)
      )
      .unique();
    
    return !!existing;
  },
});
