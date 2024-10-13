import sharp from "sharp";
import * as path from "path";

export async function resizeAndSaveImage(
  imagePath: string,
  maxWidth: number,
  maxHeight: number
) {
  // Load the image
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to get image dimensions");
  }

  // Resize the image to fit within maxWidth and maxHeight while maintaining aspect ratio
  const resizedImage = image.resize({
    width: maxWidth,
    height: maxHeight,
    fit: sharp.fit.inside,
    withoutEnlargement: true,
  });

  // Get image extension
  const imageExt = path.extname(imagePath);

  const outputPath = imagePath.replace(imageExt, "_resized" + imageExt);

  await resizedImage.toFile(outputPath);

  // console.log(`Resized image saved to: ${outputPath}`);

  return outputPath;
}
