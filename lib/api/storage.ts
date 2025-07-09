import { supabase } from '../supabase';

// Storage bucket name
const BUCKET_NAME = 'site-photos';

// Upload a file to Supabase Storage
export async function uploadSitePhoto(
  siteId: string,
  file: File,
  userId: string,
  photoType: 'site' | 'sedimentation' = 'site'
): Promise<string> {
  try {
    console.log('Starting photo upload for site:', siteId);
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check file size limit (20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 20MB`);
    }

    // Check if bucket exists (don't try to create it)
    console.log('Checking if bucket exists...');
    const bucketExists = await checkBucketExists();
    if (!bucketExists) {
      throw new Error('STORAGE_SETUP_REQUIRED: Storage bucket does not exist. Please set up storage in Supabase dashboard.');
    }
    console.log('Bucket exists and is accessible');
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const prefix = photoType === 'sedimentation' ? 'sed' : 'site';
    const fileName = `${userId}/${siteId}-${prefix}-${Date.now()}.${fileExt}`;
    console.log('Generated filename:', fileName);

    // Upload the file
    console.log('Starting file upload...');
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log('File uploaded successfully:', data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('Generated public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed with error:', error);
    if (error instanceof Error) {
      throw new Error(`Photo upload failed: ${error.message}`);
    }
    throw new Error('Failed to upload photo: Unknown error');
  }
}

// Check if the storage bucket exists
async function checkBucketExists(): Promise<boolean> {
  try {
    console.log('Checking if bucket exists...');
    
    // Try to list files in the bucket
    const { data: listData, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    console.log('List attempt result:', { listData, listError });

    // If no error, bucket exists and is accessible
    return !listError;
  } catch (error) {
    console.error('Error checking bucket:', error);
    return false;
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
    fileSizeLimit: 20 * 1024 * 1024, // 20MB
  });

  if (error && error.message !== 'Bucket already exists') {
    console.error('Error creating bucket:', error);
    throw error;
  }

  return data;
};