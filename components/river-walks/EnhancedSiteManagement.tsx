import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { updateSite, createMeasurementPoints, deleteMeasurementPointsForSite } from '../../lib/api/sites';
import { uploadSitePhoto, deleteSitePhoto } from '../../lib/api/storage';
import { EnhancedSiteForm } from './EnhancedSiteForm';
import { SiteList } from './SiteList';
import { useSites } from '../../hooks/useSites';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../../lib/supabase';
import type {
  RiverWalk,
  Site,
  SiteFormData,
  CreateSiteData,
  UpdateSiteData,
  MeasurementPointFormData,
  SedimentationMeasurement,
  CreateMeasurementPointData,
} from '../../types';

interface EnhancedSiteManagementProps {
  riverWalk: RiverWalk;
  onClose: () => void;
}

export function EnhancedSiteManagement({ riverWalk, onClose }: EnhancedSiteManagementProps) {
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

  const { showSuccess, showError } = useToast();
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Load sites when component mounts
  React.useEffect(() => {
    fetchSites(riverWalk.id);
  }, [riverWalk.id]);

  const handleEnhancedSubmit = async (
    formData: SiteFormData,
    measurementData: MeasurementPointFormData[],
    numMeasurements: number,
    riverWidth: number,
    sedimentationData: {
      photo?: File;
      measurements: SedimentationMeasurement[];
    },
    sitePhoto?: File,
    removeSitePhoto?: boolean,
    removeSedimentationPhoto?: boolean
  ) => {
    // Get current user for photo uploads
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload photos');
    }

    try {
      let sitePhotoUrl: string | null | undefined;
      let sedimentationPhotoUrl: string | null | undefined;

      if (editingSite) {
        // Editing existing site
        sitePhotoUrl = editingSite.photo_url;
        sedimentationPhotoUrl = editingSite.sedimentation_photo_url;

        // Handle site photo
        if (removeSitePhoto) {
          if (editingSite.photo_url) {
            await deleteSitePhoto(editingSite.photo_url);
          }
          sitePhotoUrl = null;
        } else if (sitePhoto) {
          if (editingSite.photo_url) {
            await deleteSitePhoto(editingSite.photo_url);
          }
          sitePhotoUrl = await uploadSitePhoto(editingSite.id, sitePhoto, session.user.id);
        }

        // Handle sedimentation photo
        if (removeSedimentationPhoto) {
          if (editingSite.sedimentation_photo_url) {
            await deleteSitePhoto(editingSite.sedimentation_photo_url);
          }
          sedimentationPhotoUrl = null;
        } else if (sedimentationData.photo) {
          if (editingSite.sedimentation_photo_url) {
            await deleteSitePhoto(editingSite.sedimentation_photo_url);
          }
          sedimentationPhotoUrl = await uploadSitePhoto(
            editingSite.id, 
            sedimentationData.photo, 
            session.user.id,
            'sedimentation'
          );
        }

        // Update site with all data
        const updateData: UpdateSiteData = {
          site_name: formData.site_name,
          river_width: riverWidth,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          notes: formData.notes || undefined,
          weather_conditions: formData.weather_conditions || undefined,
          land_use: formData.land_use || undefined,
          depth_units: formData.depth_units || 'm',
          sedimentation_units: formData.sedimentation_units || 'mm',
          photo_url: sitePhotoUrl,
          sedimentation_photo_url: sedimentationPhotoUrl,
          sedimentation_data: {
            measurements: sedimentationData.measurements,
          },
        };

        await handleUpdateSite(editingSite.id, updateData, riverWalk.id);

        // Update measurement points
        await deleteMeasurementPointsForSite(editingSite.id);
        const measurementPoints: CreateMeasurementPointData[] = measurementData.map((point, index) => ({
          point_number: index + 1,
          distance_from_bank: point.distance_from_bank,
          depth: point.depth,
        }));
        await createMeasurementPoints(editingSite.id, measurementPoints);

        setEditingSite(null);
        showSuccess('Site Updated', `${formData.site_name} has been successfully updated with all measurements and data.`);
      } else {
        // Creating new site
        const nextSiteNumber = sites.length + 1;
        const newSite: CreateSiteData = {
          river_walk_id: riverWalk.id,
          site_number: nextSiteNumber,
          site_name: formData.site_name,
          river_width: riverWidth,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          notes: formData.notes || undefined,
          weather_conditions: formData.weather_conditions || undefined,
          land_use: formData.land_use || undefined,
          depth_units: formData.depth_units || 'm',
          sedimentation_units: formData.sedimentation_units || 'mm',
          sedimentation_data: {
            measurements: sedimentationData.measurements,
          },
        };

        const createdSite = await handleCreateSite(newSite);

        if (createdSite) {
          // Upload photos if provided
          if (sitePhoto) {
            sitePhotoUrl = await uploadSitePhoto(createdSite.id, sitePhoto, session.user.id);
            await updateSite(createdSite.id, {
              site_name: createdSite.site_name,
              river_width: createdSite.river_width,
              photo_url: sitePhotoUrl,
            });
          }

          if (sedimentationData.photo) {
            sedimentationPhotoUrl = await uploadSitePhoto(
              createdSite.id, 
              sedimentationData.photo, 
              session.user.id,
              'sedimentation'
            );
            await updateSite(createdSite.id, {
              site_name: createdSite.site_name,
              river_width: createdSite.river_width,
              sedimentation_photo_url: sedimentationPhotoUrl,
            });
          }

          // Create measurement points
          const measurementPoints: CreateMeasurementPointData[] = measurementData.map((point, index) => ({
            point_number: index + 1,
            distance_from_bank: point.distance_from_bank,
            depth: point.depth,
          }));
          await createMeasurementPoints(createdSite.id, measurementPoints);
        }

        setShowSiteForm(false);
        showSuccess('Site Created', `${formData.site_name} has been successfully created with all measurements and data.`);
      }

      // Refresh sites data
      await fetchSites(riverWalk.id);
      setSitesError(null);
    } catch (error) {
      console.error('Error in handleEnhancedSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSitesError(`Operation failed: ${errorMessage}`);
      showError('Operation Failed', `Could not ${editingSite ? 'update' : 'create'} site: ${errorMessage}`);
    }
  };

  const handleEditSite = (site: Site) => {
    setSitesError(null);
    setEditingSite(site);
  };

  const handleUpdateSiteField = async (id: string, field: 'site_name' | 'river_width', value: string | number) => {
    const updateData = field === 'site_name' 
      ? { site_name: value as string, river_width: 0 }
      : { site_name: '', river_width: value as number };
    
    const existingSite = sites.find(site => site.id === id);
    if (!existingSite) return;
    
    const completeUpdateData = {
      site_name: field === 'site_name' ? value as string : existingSite.site_name,
      river_width: field === 'river_width' ? value as number : parseFloat(existingSite.river_width.toString()),
    };

    await handleUpdateSite(id, completeUpdateData, riverWalk.id);
  };

  const handleDeleteSiteWithConfirm = async (site: Site) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${site.site_name}"? This will also delete all measurement points and photos for this site.`
      )
    ) {
      try {
        await handleDeleteSite(site.id, riverWalk.id);
        showSuccess('Site Deleted', `${site.site_name} has been successfully deleted.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showError('Delete Failed', `Could not delete ${site.site_name}: ${errorMessage}`);
      }
    }
  };

  const loading = sitesLoading;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-gray-600">
              {formatDate(riverWalk.date)} •{' '}
              {riverWalk.county ? `${riverWalk.county}, ` : ''}
              {riverWalk.country || 'UK'}
            </p>
          </div>

          {sitesError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <span>{sitesError}</span>
              <button
                className="float-right"
                onClick={() => setSitesError(null)}
              >
                &times;
              </button>
            </div>
          )}

          {editingSite || showSiteForm ? (
            <EnhancedSiteForm
              editingSite={editingSite}
              nextSiteNumber={sites.length + 1}
              onSubmit={handleEnhancedSubmit}
              onCancel={() => {
                setEditingSite(null);
                setShowSiteForm(false);
              }}
              onBack={() => {
                setEditingSite(null);
                setShowSiteForm(false);
              }}
              loading={loading}
            />
          ) : (
            <SiteList
              sites={sites}
              onEditMeasurements={handleEditSite} // This now opens the enhanced form
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