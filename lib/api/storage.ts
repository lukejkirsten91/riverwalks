import { supabase } from '../supabase';

// Storage bucket name
const BUCKET_NAME = 'site-photos';

// Upload a file to Supabase Storage
export async function uploadSitePhoto(
  siteId: string,
  file: File,
  userId: string
): Promise<string> {
  try {
    // Ensure bucket exists
    await ensureBucketExists();
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${siteId}-${Date.now()}.${fileExt}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error('Failed to upload photo');
  }
}

// Ensure the storage bucket exists
async function ensureBucketExists(): Promise<void> {
  try {
    // First check if bucket exists by trying to list files
    const { error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    // If no error, bucket exists
    if (!listError) {
      return;
    }

    // If bucket doesn't exist, create it
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    if (createError && createError.message !== 'Bucket already exists') {
      console.error('Error creating bucket:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    // Don't throw here - let the upload try and provide more specific error
  }
}

// Delete a file from Supabase Storage
export async function deleteSitePhoto(photoUrl: string): Promise<void> {
  try {
    // Extract the path from the URL
    const url = new URL(photoUrl);
    const pathSegments = url.pathname.split('/');
    const filePath = pathSegments.slice(-2).join('/'); // Get the last two segments (userId/filename)

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  } catch (error) {
    console.error('Delete failed:', error);
    // Don't throw here - file might already be deleted
  }
}

// Create storage bucket if it doesn't exist (run this once in Supabase dashboard)
export const createStorageBucket = async () => {
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  });

  if (error && error.message !== 'Bucket already exists') {
    console.error('Error creating bucket:', error);
    throw error;
  }

  return data;
};