import { useState } from 'react';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { checkDatabaseSchema, checkStorageBucket, testPhotoUpload } from '../lib/api/diagnostics';

export function DiagnosticPanel() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const [schemaCheck, bucketCheck, uploadTest] = await Promise.all([
        checkDatabaseSchema(),
        checkStorageBucket(),
        testPhotoUpload()
      ]);

      setResults({
        schema: schemaCheck,
        bucket: bucketCheck,
        upload: uploadTest
      });
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Photo Upload Diagnostics"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Photo Upload Diagnostics</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>

        {results && (
          <div className="space-y-3 text-sm">
            {/* Database Schema Check */}
            <div className="border rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                {results.schema.error || (!results.schema.sitesColumnsOk || !results.schema.riverWalksColumnsOk) ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium">Database Schema</span>
              </div>
              {results.schema.error ? (
                <p className="text-red-600">{results.schema.error}</p>
              ) : (
                <div>
                  <p className="text-xs text-gray-600">
                    Sites columns: {results.schema.sitesColumnsOk ? '✅' : '❌'}
                  </p>
                  <p className="text-xs text-gray-600">
                    River walks columns: {results.schema.riverWalksColumnsOk ? '✅' : '❌'}
                  </p>
                </div>
              )}
            </div>

            {/* Storage Bucket Check */}
            <div className="border rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                {!results.bucket.bucketExists ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium">Storage Bucket</span>
              </div>
              {!results.bucket.bucketExists ? (
                <p className="text-red-600">Bucket doesn't exist: {results.bucket.error}</p>
              ) : (
                <p className="text-green-600">site-photos bucket exists</p>
              )}
            </div>

            {/* Upload Test */}
            <div className="border rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                {!results.upload.success ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium">Upload Test</span>
              </div>
              {!results.upload.success ? (
                <div>
                  <p className="text-red-600">Upload failed: {results.upload.error}</p>
                  {results.upload.error?.includes('row-level security') && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                      <p className="font-medium text-red-800">RLS Policy Fix Needed:</p>
                      <p className="text-red-700">Run the SQL script in /supabase/fix-storage-rls.sql</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-green-600">Upload successful</p>
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium">Raw Results</summary>
              <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(results, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}