import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CloudOff, Wifi } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  currentImageUrl?: string | null;
  accept?: string;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
  uploadText?: string;
  loading?: boolean;
  loadingText?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  currentImageUrl,
  accept = "image/*",
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  className = "",
  disabled = false,
  uploadText = "Upload site photo",
  loading = false,
  loadingText = "Uploading...",
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, isOfflineCapable } = useOffline();

  const handleFileSelect = async (file: File) => {
    setError(null);

    // List of supported image types
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    
    // Validate file type more specifically
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      setError('Please select a PNG, JPEG, JPG, or WEBP image file');
      return;
    }

    // If file is larger than 5MB, compress it
    if (file.size > maxSizeBytes) {
      try {
        console.log(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit. Compressing...`);
        const compressedFile = await compressImage(file, maxSizeBytes);
        console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
        onFileSelect(compressedFile);
      } catch (error) {
        console.error('Compression failed:', error);
        const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
        setError(`File size must be less than ${maxMB}MB. Unable to compress this image.`);
      }
      return;
    }

    onFileSelect(file);
  };

  // Compress image function (WhatsApp-style)
  const compressImage = (file: File, maxSizeBytes: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1920 for quality balance)
        const maxDimension = 1920;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until we get under the size limit
        const tryCompress = (quality: number) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              // Success or minimum quality reached
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Try with lower quality
              tryCompress(quality - 0.1);
            }
          }, 'image/jpeg', quality);
        };
        
        tryCompress(0.8); // Start with 80% quality
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || loading || !isOnline) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !loading && isOnline) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const openFileDialog = () => {
    if (!disabled && !loading && isOnline) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    setError(null);
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Current image display */}
      {currentImageUrl && (
        <div className="relative inline-block">
          <img
            src={currentImageUrl}
            alt="Site photo"
            className="h-32 w-32 object-cover rounded-lg border border-border shadow-modern"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-modern"
            disabled={disabled || loading}
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Loading overlay for existing image */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <div className="text-xs">{loadingText}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {!currentImageUrl && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
            ${dragOver 
              ? 'border-primary bg-primary/5 cursor-pointer' 
              : !isOnline
              ? 'border-amber-300 bg-amber-50/50 cursor-not-allowed'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
            }
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-3">
            {loading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : dragOver ? (
              <Upload className="w-8 h-8 text-primary" />
            ) : !isOnline ? (
              <CloudOff className="w-8 h-8 text-amber-600" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
            
            <div>
              <p className="text-foreground font-medium">
                {loading 
                  ? loadingText 
                  : dragOver 
                  ? 'Drop image here' 
                  : !isOnline
                  ? 'Photo upload unavailable offline'
                  : uploadText}
              </p>
              {!loading && (
                <>
                  <p className="text-muted-foreground text-sm mt-1">
                    {!isOnline
                      ? 'Connect to internet to upload photos'
                      : 'Click to browse or drag and drop'}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    PNG, JPEG, JPG, WEBP up to {Math.round(maxSizeBytes / (1024 * 1024))}MB (larger images auto-compressed)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || loading || !isOnline}
      />

      {/* Error display */}
      {error && (
        <p className="text-destructive text-sm flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}