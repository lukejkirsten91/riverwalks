import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { updateSite, createMeasurementPoints, deleteMeasurementPointsForSite } from '../../lib/api/sites';
import { uploadSitePhoto, deleteSitePhoto } from '../../lib/api/storage';
import { SiteList } from './SiteList';
import { SiteTodoList } from './SiteTodoList';
import { SiteInfoForm } from './SiteInfoForm';
import { CrossSectionForm } from './CrossSectionForm';
import { VelocityForm } from './VelocityForm';
import { SedimentForm } from './SedimentForm';
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
  VelocityData,
  UnitType,
  TodoStatus,
} from '../../types';

interface EnhancedSiteManagementProps {
  riverWalk: RiverWalk;
  onClose: () => void;
}

type CurrentView = 
  | 'site_list' 
  | 'site_todos' 
  | 'site_info_form' 
  | 'cross_section_form' 
  | 'velocity_form' 
  | 'sediment_form';

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
  
  // Navigation state
  const [currentView, setCurrentView] = useState<CurrentView>('site_list');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);

  // Load sites when component mounts
  React.useEffect(() => {
    fetchSites(riverWalk.id);
  }, [riverWalk.id]);

  // Navigation handlers
  const handleSiteSelect = (site: Site) => {
    setCurrentSite(site);
    setCurrentView('site_todos');
  };

  const handleTodoClick = (todoType: 'site_info' | 'cross_section' | 'velocity' | 'sediment') => {
    const viewMap: Record<typeof todoType, CurrentView> = {
      site_info: 'site_info_form',
      cross_section: 'cross_section_form',
      velocity: 'velocity_form',
      sediment: 'sediment_form',
    };
    setCurrentView(viewMap[todoType]);
  };

  const handleBackToTodos = () => {
    setCurrentView('site_todos');
  };

  const handleBackToSites = () => {
    setCurrentView('site_list');
    setCurrentSite(null);
  };

  // Form submission handlers
  const handleSiteInfoSubmit = async (
    formData: SiteFormData,
    sitePhoto?: File,
    removeSitePhoto?: boolean,
    todoStatus?: TodoStatus
  ) => {
    if (!currentSite) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload photos');
    }

    try {
      let sitePhotoUrl: string | null | undefined = currentSite.photo_url;

      // Handle site photo
      if (removeSitePhoto) {
        if (currentSite.photo_url) {
          await deleteSitePhoto(currentSite.photo_url);
        }
        sitePhotoUrl = null;
      } else if (sitePhoto) {
        if (currentSite.photo_url) {
          await deleteSitePhoto(currentSite.photo_url);
        }
        sitePhotoUrl = await uploadSitePhoto(currentSite.id, sitePhoto, session.user.id);
      }

      // Update site
      const updateData: UpdateSiteData = {
        site_name: formData.site_name,
        river_width: currentSite.river_width,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        notes: formData.notes || undefined,
        weather_conditions: formData.weather_conditions || undefined,
        land_use: formData.land_use || undefined,
        depth_units: currentSite.depth_units,
        sedimentation_units: currentSite.sedimentation_units,
        photo_url: sitePhotoUrl,
        todo_site_info_status: todoStatus || 'in_progress',
      };

      await handleUpdateSite(currentSite.id, updateData, riverWalk.id);
      await fetchSites(riverWalk.id);
      
      showSuccess('Site Info Updated', 'Site information has been saved successfully.');
      setCurrentView('site_todos');
    } catch (error) {
      console.error('Error updating site info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update site info: ${errorMessage}`);
    }
  };

  const handleCrossSectionSubmit = async (
    riverWidth: number,
    measurementData: MeasurementPointFormData[],
    numMeasurements: number,
    depthUnits: UnitType,
    todoStatus?: TodoStatus
  ) => {
    if (!currentSite) return;

    try {
      // Update site with new river width and depth units
      const updateData: UpdateSiteData = {
        site_name: currentSite.site_name,
        river_width: riverWidth,
        depth_units: depthUnits,
        sedimentation_units: currentSite.sedimentation_units,
        todo_cross_section_status: todoStatus || 'in_progress',
      };

      await handleUpdateSite(currentSite.id, updateData, riverWalk.id);

      // Update measurement points
      await deleteMeasurementPointsForSite(currentSite.id);
      const measurementPoints: CreateMeasurementPointData[] = measurementData.map((point, index) => ({
        point_number: index + 1,
        distance_from_bank: point.distance_from_bank,
        depth: point.depth,
      }));
      await createMeasurementPoints(currentSite.id, measurementPoints);

      await fetchSites(riverWalk.id);
      
      showSuccess('Cross-Section Updated', 'Cross-sectional measurements have been saved successfully.');
      setCurrentView('site_todos');
    } catch (error) {
      console.error('Error updating cross-section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update cross-section: ${errorMessage}`);
    }
  };

  const handleVelocitySubmit = async (
    velocityData: VelocityData,
    velocityMeasurementCount: number,
    todoStatus?: TodoStatus
  ) => {
    if (!currentSite) return;

    try {
      const updateData: UpdateSiteData = {
        site_name: currentSite.site_name,
        river_width: currentSite.river_width,
        depth_units: currentSite.depth_units,
        sedimentation_units: currentSite.sedimentation_units,
        velocity_measurement_count: velocityMeasurementCount,
        velocity_data: velocityData,
        todo_velocity_status: todoStatus || 'in_progress',
      };

      await handleUpdateSite(currentSite.id, updateData, riverWalk.id);
      await fetchSites(riverWalk.id);
      
      showSuccess('Velocity Updated', 'Velocity measurements have been saved successfully.');
      setCurrentView('site_todos');
    } catch (error) {
      console.error('Error updating velocity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update velocity: ${errorMessage}`);
    }
  };

  const handleSedimentSubmit = async (
    sedimentationData: {
      photo?: File;
      measurements: SedimentationMeasurement[];
    },
    numSedimentationMeasurements: number,
    sedimentationUnits: UnitType,
    removeSedimentationPhoto?: boolean,
    todoStatus?: TodoStatus
  ) => {
    if (!currentSite) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload photos');
    }

    try {
      let sedimentationPhotoUrl: string | null | undefined = currentSite.sedimentation_photo_url;

      // Handle sedimentation photo
      if (removeSedimentationPhoto) {
        if (currentSite.sedimentation_photo_url) {
          await deleteSitePhoto(currentSite.sedimentation_photo_url);
        }
        sedimentationPhotoUrl = null;
      } else if (sedimentationData.photo) {
        if (currentSite.sedimentation_photo_url) {
          await deleteSitePhoto(currentSite.sedimentation_photo_url);
        }
        sedimentationPhotoUrl = await uploadSitePhoto(
          currentSite.id, 
          sedimentationData.photo, 
          session.user.id,
          'sedimentation'
        );
      }

      const updateData: UpdateSiteData = {
        site_name: currentSite.site_name,
        river_width: currentSite.river_width,
        depth_units: currentSite.depth_units,
        sedimentation_units: sedimentationUnits,
        sedimentation_photo_url: sedimentationPhotoUrl,
        sedimentation_data: {
          measurements: sedimentationData.measurements,
        },
        todo_sediment_status: todoStatus || 'in_progress',
      };

      await handleUpdateSite(currentSite.id, updateData, riverWalk.id);
      await fetchSites(riverWalk.id);
      
      showSuccess('Sediment Analysis Updated', 'Sediment analysis has been saved successfully.');
      setCurrentView('site_todos');
    } catch (error) {
      console.error('Error updating sediment analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update sediment analysis: ${errorMessage}`);
    }
  };

  // Site management handlers (from SiteList)
  const handleUpdateSiteField = async (id: string, field: 'site_name' | 'river_width', value: string | number) => {
    const updateData = field === 'site_name' 
      ? { site_name: value as string, river_width: 0 }
      : { site_name: '', river_width: value as number };
    
    const existingSite = sites.find(site => site.id === id);
    if (!existingSite) return;
    
    const completeUpdateData = {
      site_name: field === 'site_name' ? value as string : existingSite.site_name,
      river_width: field === 'river_width' ? value as number : parseFloat(existingSite.river_width.toString()),
      depth_units: existingSite.depth_units,
      sedimentation_units: existingSite.sedimentation_units,
    };

    await handleUpdateSite(id, completeUpdateData, riverWalk.id);
  };

  const handleDeleteSiteWithConfirm = async (site: Site) => {
    if (
      window.confirm(
        `Are you sure you want to delete \"${site.site_name}\"? This will also delete all measurement points and photos for this site.`
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

  const handleAddNewSite = async () => {
    try {
      const nextSiteNumber = sites.length + 1;
      const newSite: CreateSiteData = {
        river_walk_id: riverWalk.id,
        site_number: nextSiteNumber,
        site_name: `Site ${nextSiteNumber}`,
        river_width: 10,
        depth_units: 'm',
        sedimentation_units: 'mm',
        todo_site_info_status: 'not_started',
        todo_cross_section_status: 'not_started',
        todo_velocity_status: 'not_started',
        todo_sediment_status: 'not_started',
      };

      const createdSite = await handleCreateSite(newSite);
      if (createdSite) {
        await fetchSites(riverWalk.id);
        showSuccess('Site Created', `${newSite.site_name} has been successfully created.`);
      }
    } catch (error) {
      console.error('Error creating site:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Creation Failed', `Could not create site: ${errorMessage}`);
    }
  };

  const getViewTitle = (): string => {
    switch (currentView) {
      case 'site_list':
        return 'Manage Sites';
      case 'site_todos':
        return currentSite?.site_name || 'Site Tasks';
      case 'site_info_form':
        return 'Site Information';
      case 'cross_section_form':
        return 'Cross-Sectional Area';
      case 'velocity_form':
        return 'Velocity Measurements';
      case 'sediment_form':
        return 'Sediment Analysis';
      default:
        return 'Manage Sites';
    }
  };

  const renderBackButton = () => {
    if (currentView === 'site_list') return null;
    
    const handleBack = currentView === 'site_todos' ? handleBackToSites : handleBackToTodos;
    
    return (
      <button
        onClick={handleBack}
        className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
        title="Back"
        type="button"
      >
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'site_list':
        return (
          <SiteList
            sites={sites}
            onEditMeasurements={handleSiteSelect} // Now opens todo list instead
            onEditSite={handleSiteSelect} // Now opens todo list instead
            onUpdateSite={handleUpdateSiteField}
            onDeleteSite={handleDeleteSiteWithConfirm}
            onAddNewSite={handleAddNewSite}
          />
        );
      
      case 'site_todos':
        return currentSite ? (
          <SiteTodoList
            site={currentSite}
            onTodoClick={handleTodoClick}
          />
        ) : null;
      
      case 'site_info_form':
        return currentSite ? (
          <SiteInfoForm
            site={currentSite}
            onSubmit={handleSiteInfoSubmit}
            onCancel={handleBackToTodos}
            loading={sitesLoading}
          />
        ) : null;
      
      case 'cross_section_form':
        return currentSite ? (
          <CrossSectionForm
            site={currentSite}
            onSubmit={handleCrossSectionSubmit}
            onCancel={handleBackToTodos}
            loading={sitesLoading}
          />
        ) : null;
      
      case 'velocity_form':
        return currentSite ? (
          <VelocityForm
            site={currentSite}
            onSubmit={handleVelocitySubmit}
            onCancel={handleBackToTodos}
            loading={sitesLoading}
          />
        ) : null;
      
      case 'sediment_form':
        return currentSite ? (
          <SedimentForm
            site={currentSite}
            onSubmit={handleSedimentSubmit}
            onCancel={handleBackToTodos}
            loading={sitesLoading}
          />
        ) : null;
      
      default:
        return null;
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
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {renderBackButton()}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold truncate">
                  {getViewTitle()}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 truncate">
                  {riverWalk.name}
                </p>
              </div>
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

          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
}