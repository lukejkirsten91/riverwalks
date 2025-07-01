import { useState } from 'react';
import { AlertTriangle, CheckCircle, Settings, RefreshCw, Database } from 'lucide-react';
import { checkDatabaseSchema, checkStorageBucket, testPhotoUpload } from '../lib/api/diagnostics';
import { offlineDataService } from '../lib/offlineDataService';

export function DiagnosticPanel() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

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

  const getSyncStatus = async () => {
    setSyncLoading(true);
    try {
      const status = await offlineDataService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to get sync status:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const triggerManualSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const result = await offlineDataService.manualSync();
      setSyncResult(result);
      // Refresh sync status after sync
      await getSyncStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncResult({
        success: false,
        message: 'Manual sync failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setSyncLoading(false);
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
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-lg z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Photo Upload & Sync Diagnostics</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
          >
            <Settings className="w-3 h-3" />
            {loading ? 'Running...' : 'Diagnostics'}
          </button>
          
          <button
            onClick={getSyncStatus}
            disabled={syncLoading}
            className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
          >
            <Database className="w-3 h-3" />
            {syncLoading ? 'Loading...' : 'Sync Status'}
          </button>
        </div>

        <button
          onClick={triggerManualSync}
          disabled={syncLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
          {syncLoading ? 'Syncing...' : 'Force Manual Sync'}
        </button>

        {syncResult && (
          <div className={`p-3 rounded text-sm ${
            syncResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {syncResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="font-medium">Manual Sync Result</span>
            </div>
            <p>{syncResult.message}</p>
          </div>
        )}

        {syncStatus && (
          <div className="border rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Sync Status</span>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <p>Online: {syncStatus.isOnline ? '✅' : '❌'}</p>
              <p>Pending items: {syncStatus.pendingItems}</p>
              <p>Offline photos: {syncStatus.offlinePhotos.length}</p>
              <p>Sites with local photos: {syncStatus.sitesWithLocalPhotos.length}</p>
              {syncStatus.sitesWithLocalPhotos.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-purple-600">Sites with local photos</summary>
                  <div className="mt-1 space-y-1">
                    {syncStatus.sitesWithLocalPhotos.map((site: any, i: number) => (
                      <div key={i} className="text-xs bg-gray-50 p-1 rounded">
                        <p>Site {site.site_number}: {site.id}</p>
                        {site.photo_url?.startsWith('local_') && (
                          <p className="text-yellow-600">Site photo: {site.photo_url}</p>
                        )}
                        {site.sedimentation_photo_url?.startsWith('local_') && (
                          <p className="text-yellow-600">Sediment photo: {site.sedimentation_photo_url}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

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