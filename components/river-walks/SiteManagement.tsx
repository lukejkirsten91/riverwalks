import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { updateSite } from '../../lib/api/sites';
import { uploadSitePhoto, deleteSitePhoto } from '../../lib/api/storage';
import { SiteForm } from './SiteForm';
import { SiteList } from './SiteList';
import { MeasurementEditor } from './MeasurementEditor';
import { useSites } from '../../hooks/useSites';
import { useMeasurements } from '../../hooks/useMeasurements';
import { supabase } from '../../lib/supabase';
import type {
  RiverWalk,
  Site,
  SiteFormData,
  CreateSiteData,
  UpdateSiteData,
} from '../../types';

interface SiteManagementProps {
  riverWalk: RiverWalk;
  onClose: () => void;
}

export function SiteManagement({ riverWalk, onClose }: SiteManagementProps) {
  const {
    sites,
    loading: sitesLoading,
    error: sitesError,
    setError: setSitesError,
    fetchSites,
    handleCreateSite,
    handleUpdateSite,
    handleDeleteSite,
  } = useSites();

  const {
    measurementData,
    numMeasurements,
    currentRiverWidth,
    loading: measurementsLoading,
    error: measurementsError,
    setError: setMeasurementsError,
    initializeMeasurements,
    handleNumMeasurementsChange,
    handleRiverWidthChange,
    handleMeasurementChange,
    saveMeasurementPoints,
    resetMeasurements,
  } = useMeasurements();

  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingMeasurements, setEditingMeasurements] = useState<Site | null>(
    null
  );

  // Load sites when component mounts
  React.useEffect(() => {
    fetchSites(riverWalk.id);
  }, [riverWalk.id]);

  const handleCreateSiteSubmit = async (formData: SiteFormData, photoFile?: File) => {
    const nextSiteNumber = sites.length + 1;
    let photoUrl: string | undefined;

    // Get current user for photo upload
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload photos');
    }

    const newSite: CreateSiteData = {
      river_walk_id: riverWalk.id,
      site_number: nextSiteNumber,
      site_name: formData.site_name,
      river_width: parseFloat(formData.river_width),
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      notes: formData.notes || undefined,
    };

    // Create the site first to get the ID
    const createdSite = await handleCreateSite(newSite);
    
    // Upload photo if provided
    if (photoFile && createdSite) {
      try {
        console.log('Uploading photo for site:', createdSite.id);
        photoUrl = await uploadSitePhoto(createdSite.id, photoFile, session.user.id);
        console.log('Photo uploaded successfully, URL:', photoUrl);
        
        // Update the site with the photo URL
        await updateSite(createdSite.id, {
          site_name: createdSite.site_name,
          river_width: createdSite.river_width,
          photo_url: photoUrl,
        });
        console.log('Site updated with photo URL');
        
        // Refresh the sites list to show the updated photo
        await fetchSites(riverWalk.id);
        console.log('Sites list refreshed');
      } catch (error) {
        console.error('Error uploading photo:', error);
        setSitesError(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Site was created successfully, just photo upload failed
      }
    }
    
    setShowSiteForm(false);
  };

  const handleEditSiteSubmit = async (formData: SiteFormData, photoFile?: File) => {
    if (!editingSite) return;
    
    // Get current user for photo upload
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload photos');
    }

    let photoUrl: string | undefined = editingSite.photo_url || undefined;

    // Handle photo upload/replacement
    if (photoFile) {
      try {
        console.log('Handling photo upload for existing site:', editingSite.id);
        // Delete old photo if exists
        if (editingSite.photo_url) {
          console.log('Deleting old photo:', editingSite.photo_url);
          await deleteSitePhoto(editingSite.photo_url);
        }
        // Upload new photo
        console.log('Uploading new photo...');
        photoUrl = await uploadSitePhoto(editingSite.id, photoFile, session.user.id);
        console.log('New photo uploaded successfully, URL:', photoUrl);
      } catch (error) {
        console.error('Error handling photo:', error);
        setMeasurementsError(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with update even if photo operation fails
      }
    }
    
    const updateData: UpdateSiteData = {
      site_name: formData.site_name,
      river_width: parseFloat(formData.river_width),
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      notes: formData.notes || undefined,
      photo_url: photoUrl,
    };

    await handleUpdateSite(editingSite.id, updateData, riverWalk.id);
    setEditingSite(null);
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
  };

  const handleUpdateSiteField = async (id: string, field: 'site_name' | 'river_width', value: string | number) => {
    const updateData = field === 'site_name' 
      ? { site_name: value as string, river_width: 0 } // We'll get river_width from existing data
      : { site_name: '', river_width: value as number }; // We'll get site_name from existing data
    
    // Find the existing site to get the other field value
    const existingSite = sites.find(site => site.id === id);
    if (!existingSite) return;
    
    const completeUpdateData = {
      site_name: field === 'site_name' ? value as string : existingSite.site_name,
      river_width: field === 'river_width' ? value as number : parseFloat(existingSite.river_width.toString()),
    };

    await handleUpdateSite(id, completeUpdateData, riverWalk.id);
  };

  const handleEditMeasurements = (site: Site) => {
    setEditingMeasurements(site);
    initializeMeasurements(site);
  };

  const handleSaveMeasurements = async () => {
    if (!editingMeasurements) return;

    try {
      // Update site river width if it changed
      if (
        currentRiverWidth !==
        parseFloat(editingMeasurements.river_width.toString())
      ) {
        await updateSite(editingMeasurements.id, {
          site_name: editingMeasurements.site_name,
          river_width: currentRiverWidth,
        });
      }

      // Save measurement points
      await saveMeasurementPoints(editingMeasurements.id);

      // Refresh sites data and close measurement editing
      await fetchSites(riverWalk.id);
      setEditingMeasurements(null);
      resetMeasurements();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCancelMeasurements = () => {
    setEditingMeasurements(null);
    resetMeasurements();
  };

  const handleDeleteSiteWithConfirm = async (site: Site) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${site.site_name}"? This will also delete all measurement points for this site.`
      )
    ) {
      await handleDeleteSite(site.id, riverWalk.id);
    }
  };

  const error = sitesError || measurementsError;
  const loading = sitesLoading || measurementsLoading;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile-optimized header */}
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 z-10">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold truncate">
                Manage Sites
              </h2>
              <p className="text-sm sm:text-base text-gray-600 truncate">
                {riverWalk.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 touch-manipulation"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area with proper mobile padding */}
        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-gray-600">
              {formatDate(riverWalk.date)} •{' '}
              {riverWalk.county ? `${riverWalk.county}, ` : ''}
              {riverWalk.country || 'UK'}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <span>{error}</span>
              <button
                className="float-right"
                onClick={() => {
                  setSitesError(null);
                  setMeasurementsError(null);
                }}
              >
                &times;
              </button>
            </div>
          )}

          {editingMeasurements ? (
            <MeasurementEditor
              site={editingMeasurements}
              measurementData={measurementData}
              numMeasurements={numMeasurements}
              currentRiverWidth={currentRiverWidth}
              loading={loading}
              onNumMeasurementsChange={handleNumMeasurementsChange}
              onRiverWidthChange={handleRiverWidthChange}
              onMeasurementChange={handleMeasurementChange}
              onSave={handleSaveMeasurements}
              onCancel={handleCancelMeasurements}
            />
          ) : editingSite ? (
            <SiteForm
              editingSite={editingSite}
              onSubmit={handleEditSiteSubmit}
              onCancel={() => setEditingSite(null)}
              loading={loading}
            />
          ) : showSiteForm ? (
            <SiteForm
              onSubmit={handleCreateSiteSubmit}
              onCancel={() => setShowSiteForm(false)}
              loading={loading}
            />
          ) : (
            <SiteList
              sites={sites}
              onEditMeasurements={handleEditMeasurements}
              onEditSite={handleEditSite}
              onUpdateSite={handleUpdateSiteField}
              onDeleteSite={handleDeleteSiteWithConfirm}
              onAddNewSite={() => setShowSiteForm(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
