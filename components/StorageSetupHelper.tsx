import { useState } from 'react';
import { AlertTriangle, Copy, CheckCircle } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

export function StorageSetupHelper() {
  const [showHelper, setShowHelper] = useState(false);
  useScrollLock(showHelper);
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- Run this SQL in your Supabase SQL Editor to set up storage
-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-photos',
  'site-photos', 
  true,
  5242880, -- 5MB
  '{"image/png","image/jpeg","image/jpg","image/webp"}'
);

-- 2. Set up RLS policies for the bucket
CREATE POLICY "Users can upload their own site photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'site-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own site photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'site-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own site photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'site-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!showHelper) {
    return (
      <div className="fixed bottom-16 right-4 z-50">
        <button
          onClick={() => setShowHelper(true)}
          className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
          title="Storage Setup Help"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Storage Setup Required
          </h3>
          <button
            onClick={() => setShowHelper(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Photo uploads are failing!</h4>
            <p className="text-red-800 text-sm">
              The Supabase storage bucket needs to be created manually. Follow these steps:
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Go to your Supabase dashboard → SQL Editor</li>
              <li>Copy the SQL script below</li>
              <li>Paste and run it in the SQL Editor</li>
              <li>Refresh this page and try uploading photos again</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">SQL Script:</h4>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy SQL
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-100 border rounded p-3 text-xs overflow-x-auto">
              <code>{sqlScript}</code>
            </pre>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">After running the SQL:</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• The 'site-photos' storage bucket will be created</li>
              <li>• Users will only be able to upload/view their own photos</li>
              <li>• Photo uploads will work automatically</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowHelper(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}