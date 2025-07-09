// Script to set up Supabase storage bucket for photo uploads
// Run this once to create the required storage bucket
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('Setting up storage bucket...');
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('site-photos', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fileSizeLimit: 20 * 1024 * 1024, // 20MB
    });

    if (error && error.message !== 'Bucket already exists') {
      console.error('Error creating bucket:', error);
      throw error;
    }

    if (error && error.message === 'Bucket already exists') {
      console.log('✅ Storage bucket already exists');
    } else {
      console.log('✅ Storage bucket created successfully');
    }

    // Set up bucket policies (if needed)
    console.log('Storage setup complete!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupStorage();