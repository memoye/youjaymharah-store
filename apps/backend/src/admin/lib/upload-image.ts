import { sdk } from "./sdk";

/**
 * Uploads one file (an image, or a hero video) through the file module and
 * returns its public address.
 */
export async function uploadImage(file: File): Promise<string> {
  const { files } = await sdk.admin.upload.create({ files: [file] });
  const url = files[0]?.url;

  if (!url) {
    throw new Error("The upload did not return a file address.");
  }

  return url;
}
