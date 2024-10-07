import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

interface ImagePiece {
  buffer: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function resizeAndSaveImage(
  imagePath: string,
  maxWidth: number,
  maxHeight: number
) {
  // console.log("Trying to resize image:", imagePath);

  // Load the image
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to get image dimensions");
  }

  // console.log("Original image dimensions:", metadata);

  // Resize the image to fit within maxWidth and maxHeight while maintaining aspect ratio
  const resizedImage = image.resize({
    width: maxWidth,
    height: maxHeight,
    fit: sharp.fit.inside,
    withoutEnlargement: true,
  });

  // Get the metadata of the resized image
  const resizedMetadata = await resizedImage.metadata();
  // console.log("Resized image dimensions:", resizedMetadata);

  // Get image extension
  const imageExt = path.extname(imagePath);

  const outputPath = imagePath.replace(imageExt, "_resized" + imageExt);

  await resizedImage.toFile(outputPath);

  // console.log(`Resized image saved to: ${outputPath}`);

  return outputPath;
}
