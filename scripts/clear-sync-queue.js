/**
 * One-time script to clear the sync queue after removing debug buttons
 * Run this in the browser console on the river-walks page
 */

(async function clearSyncQueue() {
  try {
    // Access the global offlineDataService
    if (typeof window !== 'undefined' && window.offlineDataService) {
      console.log('Clearing sync queue...');
      await window.offlineDataService.clearSyncQueue();
      console.log('✅ Sync queue cleared successfully');
      
      // Trigger a data refresh
      window.location.reload();
    } else {
      console.error('❌ offlineDataService not found. Make sure you are on the river-walks page.');
    }
  } catch (error) {
    console.error('❌ Error clearing sync queue:', error);
  }
})();