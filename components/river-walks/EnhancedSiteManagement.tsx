import React, { useState, useRef } from 'react';
import { formatDate } from '../../lib/utils';
import { updateSite } from '../../lib/api/sites';
import { uploadSitePhoto, deleteSitePhoto } from '../../lib/api/storage';
import { offlineDataService } from '../../lib/offlineDataService';
import { SiteList } from './SiteList';
import { SiteTodoList } from './SiteTodoList';
import { SiteInfoForm, type SiteInfoFormRef } from './SiteInfoForm';
import { CrossSectionForm } from './CrossSectionForm';
import { VelocityForm } from './VelocityForm';
import { SedimentForm } from './SedimentForm';
import { useOfflineSites } from '../../hooks/useOfflineData';
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
  const { showSuccess, showError } = useToast();
  
  const {
    sites,
    loading: sitesLoading,
    error: sitesError,
    createSite,
    updateSite,
    deleteSite,
    refetch: fetchSites,
  } = useOfflineSites(riverWalk.id);

  // For now, these are not implemented in offline hooks
  const setSitesError = (error: string | null) => {
    console.error(error);
  };
  
  const handleCreateSite = async (siteData: CreateSiteData) => {
    return await createSite(siteData);
  };
  
  const handleUpdateSite = async (id: string, data: UpdateSiteData, riverWalkId?: string, showToast: boolean = true) => {
    // Check permissions before attempting to update
    if (riverWalk.collaboration_role === 'viewer') {
      return; // Silently do nothing for viewers as UI should be read-only
    }

    try {
      await updateSite(id, data);
      await fetchSites();
      if (showToast) {
        showSuccess('Site Updated', 'Site has been successfully updated.');
      }
    } catch (error) {
      console.error('Failed to update site:', error);
      
      // Check for RLS permission errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to update site';
      if (errorMessage.includes('insufficient_privilege') || errorMessage.includes('permission denied')) {
        if (showToast) {
          showError('Permission Denied', 'You do not have permission to edit this site.');
        }
      } else {
        if (showToast) {
          showError('Update Failed', errorMessage);
        }
      }
      throw error; // Re-throw so calling function can handle the error appropriately
    }
  };
  
  const handleDeleteSite = async (id: string, riverWalkId?: string) => {
    // Check permissions before attempting to delete
    if (riverWalk.collaboration_role === 'viewer') {
      return; // Silently do nothing for viewers as buttons should be hidden
    }

    try {
      await deleteSite(id);
      showSuccess('Site Deleted', 'Site has been successfully deleted.');
      
      // If we're currently viewing this site, go back to site list
      if (currentSite?.id === id) {
        setCurrentView('site_list');
        setCurrentSite(null);
      }
    } catch (error) {
      console.error('Failed to delete site:', error);
      
      // Check for RLS permission errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete site';
      if (errorMessage.includes('insufficient_privilege') || errorMessage.includes('permission denied')) {
        showError('Permission Denied', 'You do not have permission to delete this site.');
      } else {
        showError('Delete Failed', errorMessage);
      }
    }
  };
  
  // Navigation state
  const [currentView, setCurrentView] = useState<CurrentView>('site_list');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextView, setNextView] = useState<CurrentView | null>(null);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'back'>('forward');
  const [animationClass, setAnimationClass] = useState('');
  
  // Add new site loading state
  const [addingSite, setAddingSite] = useState(false);
  
  // Form refs for triggering save confirmations
  const siteInfoFormRef = useRef<SiteInfoFormRef>(null);

  // Animated view transition function
  const animateToView = (newView: CurrentView, direction: 'forward' | 'back' = 'forward', newSite?: Site | null) => {
    if (isAnimating || newView === currentView) return;
    
    setIsAnimating(true);
    setNextView(newView);
    setAnimationDirection(direction);
    
    // Set exit animation
    const exitClass = direction === 'forward' ? 'site-view-exit' : 'site-view-exit-back';
    setAnimationClass(exitClass);
    
    // After exit animation, change view and start enter animation
    setTimeout(() => {
      setCurrentView(newView);
      if (newSite !== undefined) {
        setCurrentSite(newSite);
      }
      
      // Set enter animation
      const enterClass = direction === 'forward' ? 'site-view-enter' : 'site-view-enter-back';
      setAnimationClass(enterClass);
      
      // Clear animation state after enter animation
      setTimeout(() => {
        setAnimationClass('');
        setIsAnimating(false);
        setNextView(null);
      }, 400); // Match animation duration
    }, 400); // Match animation duration
  };

  // Handle browser back button
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
        setCurrentSite(event.state.site || null);
      } else {
        // If no state, go back to site list or close modal
        if (currentView !== 'site_list') {
          setCurrentView('site_list');
          setCurrentSite(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Push initial state
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: 'site_list' }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentView, onClose]);

  // Load sites when component mounts (fetchSites/refetch doesn't need params in offline hook)
  React.useEffect(() => {
    fetchSites();
  }, [riverWalk.id, fetchSites]);

  // Scroll to top when modal opens or view changes
  React.useEffect(() => {
    const modalElement = document.querySelector('[data-modal="site-management"]');
    if (modalElement) {
      modalElement.scrollTop = 0;
    }
  }, [currentView]);

  // Navigation handlers
  const handleSiteSelect = (site: Site) => {
    animateToView('site_todos', 'forward', site);
    // Push state for back button navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: 'site_todos', site }, '', window.location.href);
    }
  };

  const handleTodoClick = (todoType: 'site_info' | 'cross_section' | 'velocity' | 'sediment') => {
    const viewMap: Record<typeof todoType, CurrentView> = {
      site_info: 'site_info_form',
      cross_section: 'cross_section_form',
      velocity: 'velocity_form',
      sediment: 'sediment_form',
    };
    const newView = viewMap[todoType];
    animateToView(newView, 'forward');
    // Push state for back button navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: newView, site: currentSite }, '', window.location.href);
    }
  };

  const handleBackToTodos = () => {
    animateToView('site_todos', 'back');
    // Push state for back button navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: 'site_todos', site: currentSite }, '', window.location.href);
    }
  };

  const handleBackToSites = () => {
    animateToView('site_list', 'back', null);
    // Push state for back button navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ view: 'site_list' }, '', window.location.href);
    }
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
        // Only upload if it's a new photo file, not already stored offline
        if (currentSite.photo_url) {
          await deleteSitePhoto(currentSite.photo_url);
        }
        sitePhotoUrl = await uploadSitePhoto(currentSite.id, sitePhoto, session.user.id);
      } else {
        // Preserve existing photo URL (could be offline or online)
        sitePhotoUrl = currentSite.photo_url;
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
      await fetchSites();
      
      // Update current site state immediately for instant UI update
      setCurrentSite(prev => prev ? { ...prev, ...updateData } : null);
      
      showSuccess('Site Info Updated', 'Site information has been saved successfully.');
      animateToView('site_todos', 'back');
      // Push state for back button navigation
      if (typeof window !== 'undefined') {
        window.history.pushState({ view: 'site_todos', site: currentSite }, '', window.location.href);
      }
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

      await handleUpdateSite(currentSite.id, updateData, riverWalk.id, false); // Don't show toast here

      // Update measurement points using offline service
      await offlineDataService.deleteMeasurementPointsForSite(currentSite.id);
      const measurementPoints: CreateMeasurementPointData[] = measurementData.map((point, index) => ({
        point_number: index + 1,
        distance_from_bank: point.distance_from_bank,
        depth: point.depth,
      }));
      await offlineDataService.createMeasurementPoints(currentSite.id, measurementPoints);

      await fetchSites();
      
      // Update current site state immediately for instant UI update (including measurement points)
      const updatedMeasurementPoints = measurementPoints.map((point, index) => ({
        id: `temp-${index}`, // Temporary ID for immediate UI update
        site_id: currentSite.id,
        point_number: point.point_number,
        distance_from_bank: point.distance_from_bank,
        depth: point.depth,
        created_at: new Date().toISOString(),
      }));
      
      setCurrentSite(prev => prev ? { 
        ...prev, 
        ...updateData,
        measurement_points: updatedMeasurementPoints
      } : null);
      
      showSuccess('Cross-Section Updated', 'Cross-sectional measurements have been saved successfully.');
      animateToView('site_todos', 'back');
      // Push state for back button navigation
      if (typeof window !== 'undefined') {
        window.history.pushState({ view: 'site_todos', site: currentSite }, '', window.location.href);
      }
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
      await fetchSites();
      
      // Update current site state immediately for instant UI update
      setCurrentSite(prev => prev ? { ...prev, ...updateData } : null);
      
      showSuccess('Velocity Updated', 'Velocity measurements have been saved successfully.');
      animateToView('site_todos', 'back');
      // Push state for back button navigation
      if (typeof window !== 'undefined') {
        window.history.pushState({ view: 'site_todos', site: currentSite }, '', window.location.href);
      }
    } catch (error) {
      console.error('Error updating velocity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update velocity: ${errorMessage}`);
    }
  };

  const handleSedimentSubmit = async (
    sedimentationData: {
      photo?: File;
      photoUrl?: string;
      isOfflinePhoto?: boolean;
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
      } else if (sedimentationData.photo && !sedimentationData.isOfflinePhoto) {
        // Only upload if it's not already stored offline
        if (currentSite.sedimentation_photo_url) {
          await deleteSitePhoto(currentSite.sedimentation_photo_url);
        }
        sedimentationPhotoUrl = await uploadSitePhoto(
          currentSite.id, 
          sedimentationData.photo, 
          session.user.id,
          'sedimentation'
        );
      } else if (sedimentationData.isOfflinePhoto && sedimentationData.photoUrl) {
        // Use the offline photo URL directly
        sedimentationPhotoUrl = sedimentationData.photoUrl;
      } else {
        // Preserve existing photo URL (could be offline or online)
        sedimentationPhotoUrl = currentSite.sedimentation_photo_url;
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
      await fetchSites();
      
      // Update current site state immediately for instant UI update
      setCurrentSite(prev => prev ? { ...prev, ...updateData } : null);
      
      showSuccess('Sediment Analysis Updated', 'Sediment analysis has been saved successfully.');
      animateToView('site_todos', 'back');
      // Push state for back button navigation
      if (typeof window !== 'undefined') {
        window.history.pushState({ view: 'site_todos', site: currentSite }, '', window.location.href);
      }
    } catch (error) {
      console.error('Error updating sediment analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Update Failed', `Could not update sediment analysis: ${errorMessage}`);
    }
  };

  // Site management handlers (from SiteList)
  const handleUpdateSiteField = async (id: string, field: 'river_width', value: number) => {
    const existingSite = sites.find(site => site.id === id);
    if (!existingSite) return;
    
    const completeUpdateData = {
      site_name: existingSite.site_name,
      river_width: value,
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
    // Check permissions before attempting to create
    if (riverWalk.collaboration_role === 'viewer') {
      return; // Silently do nothing for viewers as button should be hidden
    }

    if (addingSite) return; // Prevent double clicks

    setAddingSite(true);
    try {
      // Use sequential numbering: always use next number after highest existing
      // This is more intuitive - no gap filling that confuses users
      const existingSiteNumbers = sites.map(site => site.site_number);
      const maxSiteNumber = existingSiteNumbers.length > 0 ? Math.max(...existingSiteNumbers) : 0;
      const nextSiteNumber = maxSiteNumber + 1;
      
      console.log('Creating new site with number:', nextSiteNumber);
      console.log('Existing site numbers:', existingSiteNumbers.sort((a, b) => a - b));
      
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
        await fetchSites();
        showSuccess('Site Created', `${newSite.site_name} has been successfully created.`);
      }
    } catch (error) {
      console.error('Error creating site:', error);
      console.error('Full error object:', error);
      
      // Enhanced error messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for RLS permission errors
        if (errorMessage.includes('insufficient_privilege') || errorMessage.includes('permission denied')) {
          showError('Permission Denied', 'You do not have permission to create sites in this river walk.');
          return;
        }
        
        // Check for specific database constraint violations
        if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
          errorMessage = 'Site number conflict detected. This might be due to a database sync issue. Please refresh the page and try again.';
        } else if (errorMessage.includes('foreign key') || errorMessage.includes('river_walk_id')) {
          errorMessage = 'Invalid river walk reference. Please refresh the page and try again.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
          errorMessage = 'Permission denied. Please make sure you are logged in and try again.';
        }
      }
      
      showError('Site Creation Failed', `Could not create site: ${errorMessage}`);
    } finally {
      setAddingSite(false);
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
    
    const handleBack = () => {
      // If we're on a form, trigger the save confirmation dialog
      if (currentView === 'site_info_form' && siteInfoFormRef.current) {
        siteInfoFormRef.current.triggerSaveConfirmation();
      } else if (currentView === 'site_todos') {
        handleBackToSites();
      } else {
        // For other forms that don't have confirmation yet, use the old behavior
        handleBackToTodos();
      }
    };
    
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
    const content = (() => {
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
              addingSite={addingSite}
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
            ref={siteInfoFormRef}
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
    })();

    return (
      <div className={`w-full site-view-container ${animationClass}`}>
        {content}
      </div>
    );
  };

  const loading = sitesLoading;

  return (
    <div 
      className="bg-white rounded-lg w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0"
      data-modal="site-management"
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
  );
}