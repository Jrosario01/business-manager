import { supabase } from '../config/supabase';

// Security constants
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * @param uri Local file URI from ImagePicker
 * @param bucket The Supabase storage bucket name (default: 'product-images')
 * @returns Public URL of the uploaded image
 */
export const uploadImageToSupabase = async (
  uri: string,
  bucket: string = 'product-images'
): Promise<string> => {
  try {
    // Validate file extension
    const fileExt = uri.split('.').pop()?.toLowerCase() || '';

    if (!fileExt || !ALLOWED_IMAGE_TYPES.includes(fileExt)) {
      throw new Error(`Invalid file type. Only ${ALLOWED_IMAGE_TYPES.join(', ')} files are allowed.`);
    }

    // Generate unique filename
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Get Supabase upload URL
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User is not authenticated. Please log in.');
    }

    // Fetch file and validate size
    let fileData;
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);

      // Validate file size
      if (fileData.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller image.`);
      }
    } catch (fileError) {
      if (fileError instanceof Error) {
        throw fileError;
      }
      console.error('Failed to read file:', fileError);
      throw new Error('Failed to read image file');
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // Check if bucket exists
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(`Storage bucket "${bucket}" does not exist. Please create it in Supabase Dashboard.`);
      }

      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Image upload error:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl The public URL of the image to delete
 * @param bucket The Supabase storage bucket name (default: 'product-images')
 */
export const deleteImageFromSupabase = async (
  imageUrl: string,
  bucket: string = 'product-images'
): Promise<void> => {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    if (!fileName) {
      console.error('Could not extract filename from URL');
      return;
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting image from Supabase:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    // Don't throw - deletion errors shouldn't block operations
  }
};
