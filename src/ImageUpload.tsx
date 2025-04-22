import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function ImageUpload() {
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const saveImage = useMutation(api.images.saveImage);
  const [isDragging, setIsDragging] = useState(false);
  
  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    
    try {
      // Create a canvas to resize the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Load the image
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));
      
      // Calculate dimensions to maintain aspect ratio and fit within 800x800
      let width = img.width;
      let height = img.height;
      const maxSize = 800;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      // Make it square by cropping the center
      const size = Math.min(width, height);
      canvas.width = size;
      canvas.height = size;
      
      // Draw the image centered in the canvas
      const offsetX = (width - size) / 2;
      const offsetY = (height - size) / 2;
      ctx.drawImage(
        img,
        offsetX,
        offsetY,
        size,
        size,
        0,
        0,
        size,
        size
      );
      
      // Convert the canvas to a blob
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9)
      );
      
      // Get the upload URL and upload the image
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const { storageId } = await result.json();
      
      // Save the image reference to the database
      await saveImage({ storageId });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    }
  }, [generateUploadUrl, saveImage]);
  
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <div className="text-gray-600">
        Drag and drop an image here to upload
      </div>
    </div>
  );
}
