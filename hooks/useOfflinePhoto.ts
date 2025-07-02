import { useState, useCallback, useEffect } from 'react';
import { offlineDataService } from '../lib/offlineDataService';
import { useToast } from '../components/ui/ToastProvider';

export interface PhotoState {
  file: File | null;
  preview: string | null;
  isUploading: boolean;
  photoUrl: string | null;
  isOfflinePhoto: boolean;
}

export function useOfflinePhoto(
  type: 'site_photo' | 'sediment_photo',
  relatedId: string,
  initialPhotoUrl?: string | null
) {
  const { showSuccess, showError } = useToast();
  
  const [photoState, setPhotoState] = useState<PhotoState>({
    file: null,
    preview: initialPhotoUrl || null,
    isUploading: false,
    photoUrl: initialPhotoUrl || null,
    isOfflinePhoto: false
  });

  // Load existing offline photos on mount
  useEffect(() => {
    const loadOfflinePhotos = async () => {
      if (!relatedId) return;
      
      try {
        const photos = await offlineDataService.getPhotosByRelatedId(relatedId);
        const relevantPhoto = photos.find(p => p.type === type);
        
        if (relevantPhoto && !relevantPhoto.synced) {
          // Found offline photo, create preview
          const preview = URL.createObjectURL(relevantPhoto.file);
          setPhotoState(prev => ({
            ...prev,
            preview,
            photoUrl: relevantPhoto.localId,
            isOfflinePhoto: true
          }));
        }
      } catch (error) {
        console.error('Failed to load offline photos:', error);
      }
    };

    loadOfflinePhotos();
  }, [relatedId, type]);

  const selectPhoto = useCallback(async (file: File) => {
    if (!relatedId) {
      showError('Error', 'Cannot upload photo: site not saved yet');
      return;
    }

    setPhotoState(prev => ({ ...prev, isUploading: true }));
    
    try {
      // Create preview immediately
      const preview = URL.createObjectURL(file);
      
      // Store photo offline (will upload immediately if online, queue if offline)
      const photoId = await offlineDataService.storePhotoOffline(file, type, relatedId);
      
      // Check if the photo ID looks like a URL (successfully uploaded) or local ID
      const isUrl = photoId.startsWith('http');
      
      setPhotoState({
        file,
        preview,
        isUploading: false,
        photoUrl: photoId,
        isOfflinePhoto: !isUrl
      });

      if (isUrl) {
        showSuccess('Photo Attached', 'Photo successfully attached.');
      } else {
        showSuccess('Photo Attached', 'Photo successfully attached.');
      }
      
    } catch (error) {
      console.error('Failed to save photo:', error);
      setPhotoState(prev => ({ ...prev, isUploading: false }));
      showError('Upload Failed', 'Failed to save photo. Please try again.');
    }
  }, [relatedId, type, showSuccess, showError]);

  const removePhoto = useCallback(async () => {
    if (!photoState.photoUrl || !relatedId) return;

    try {
      if (photoState.isOfflinePhoto) {
        // Remove from offline storage
        await offlineDataService.deletePhotoOffline(photoState.photoUrl, relatedId);
        showSuccess('Photo Removed', 'Photo successfully removed.');
      } else {
        // For online photos, handle deletion immediately
        await offlineDataService.removeOnlinePhoto(photoState.photoUrl, relatedId, type);
        showSuccess('Photo Removed', 'Photo successfully removed.');
      }

      // Clean up preview URL
      if (photoState.preview) {
        URL.revokeObjectURL(photoState.preview);
      }

      setPhotoState({
        file: null,
        preview: null,
        isUploading: false,
        photoUrl: null,
        isOfflinePhoto: false
      });

    } catch (error) {
      console.error('Failed to remove photo:', error);
      showError('Remove Failed', 'Failed to remove photo. Please try again.');
    }
  }, [photoState, relatedId, type, showSuccess, showError]);

  const getPhotoUrl = useCallback(async (photoId: string) => {
    if (!photoId || !relatedId) return null;
    
    // If it's already a URL, return it
    if (photoId.startsWith('http')) {
      return photoId;
    }
    
    // Otherwise, get from offline storage
    return await offlineDataService.getPhotoUrl(photoId, relatedId);
  }, [relatedId]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoState.preview && !photoState.photoUrl?.startsWith('http')) {
        URL.revokeObjectURL(photoState.preview);
      }
    };
  }, [photoState.preview, photoState.photoUrl]);

  return {
    photoState,
    selectPhoto,
    removePhoto,
    getPhotoUrl,
    // Helper properties for easier access
    hasPhoto: !!photoState.photoUrl,
    isUploading: photoState.isUploading,
    preview: photoState.preview,
    isOfflinePhoto: photoState.isOfflinePhoto
  };
}