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