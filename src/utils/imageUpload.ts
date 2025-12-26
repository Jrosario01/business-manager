import { supabase } from '../config/supabase';

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
    console.log('Starting image upload to Supabase...');
    console.log('Bucket:', bucket);
    console.log('Image URI:', uri);

    // Generate unique filename
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Generated filename:', fileName);

    // For React Native, use FormData
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: `image/${fileExt}`,
      name: fileName,
    } as any);

    // Get Supabase upload URL
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User is not authenticated. Please log in.');
    }

    console.log('User is authenticated, uploading...');

    // Try arrayBuffer for React Native compatibility
    let fileData;
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);
      console.log('File data created successfully, size:', fileData.length);
    } catch (fileError) {
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

    console.log('✅ Image uploaded successfully!');
    console.log('Public URL:', publicUrlData.publicUrl);
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

    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Image deletion error:', error);
    // Don't throw - deletion errors shouldn't block operations
  }
};
