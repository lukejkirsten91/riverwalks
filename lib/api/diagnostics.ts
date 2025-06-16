import { supabase } from '../supabase';

// Diagnostic functions to help debug setup issues

export async function checkDatabaseSchema(): Promise<{
  sitesColumns: any[];
  riverWalksColumns: any[];
  error?: string;
}> {
  try {
    // Check sites table columns
    const { data: sitesColumns, error: sitesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'sites')
      .eq('table_schema', 'public');

    // Check river_walks table columns  
    const { data: riverWalksColumns, error: riverWalksError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'river_walks')
      .eq('table_schema', 'public');

    if (sitesError || riverWalksError) {
      return {
        sitesColumns: [],
        riverWalksColumns: [],
        error: sitesError?.message || riverWalksError?.message || 'Unknown error'
      };
    }

    return {
      sitesColumns: sitesColumns || [],
      riverWalksColumns: riverWalksColumns || []
    };
  } catch (error) {
    return {
      sitesColumns: [],
      riverWalksColumns: [],
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
    // Create a test blob
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Try to upload
    const fileName = `test/${Date.now()}.txt`;
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