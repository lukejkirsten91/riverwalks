import { supabase } from '../supabase';

// Diagnostic functions to help debug setup issues

export async function checkDatabaseSchema(): Promise<{
  sitesColumnsOk: boolean;
  riverWalksColumnsOk: boolean;
  error?: string;
}> {
  try {
    // Test if we can select from sites table with new columns
    const { data: siteTest, error: siteError } = await supabase
      .from('sites')
      .select('id, photo_url, latitude, longitude, notes')
      .limit(1);

    // Test if we can select from river_walks table with new columns
    const { data: riverWalkTest, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('id, notes')
      .limit(1);

    return {
      sitesColumnsOk: !siteError,
      riverWalksColumnsOk: !riverWalkError,
      error: siteError?.message || riverWalkError?.message
    };
  } catch (error) {
    return {
      sitesColumnsOk: false,
      riverWalksColumnsOk: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function checkStorageBucket(): Promise<{
  bucketExists: boolean;
  bucketInfo?: any;
  error?: string;
}> {
  try {
    // Try to list files in the bucket
    const { data, error } = await supabase.storage
      .from('site-photos')
      .list('', { limit: 1 });

    if (error) {
      return {
        bucketExists: false,
        error: error.message
      };
    }

    return {
      bucketExists: true,
      bucketInfo: data
    };
  } catch (error) {
    return {
      bucketExists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testPhotoUpload(): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Create a minimal 1x1 PNG image as test data
    const pngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x0A, 0x2D, 0xB4, 0x09, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    const testBlob = new Blob([pngData], { type: 'image/png' });
    const testFile = new File([testBlob], 'test.png', { type: 'image/png' });

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Try to upload
    const fileName = `test/${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('site-photos')
      .upload(fileName, testFile);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('site-photos')
      .getPublicUrl(data.path);

    // Clean up test file
    await supabase.storage
      .from('site-photos')
      .remove([data.path]);

    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}