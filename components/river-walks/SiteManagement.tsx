import React, { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { updateSite } from '../../lib/api/sites';
import { SiteForm } from './SiteForm';
import { SiteList } from './SiteList';
import { MeasurementEditor } from './MeasurementEditor';
import { useSites } from '../../hooks/useSites';
import { useMeasurements } from '../../hooks/useMeasurements';
import type {
  RiverWalk,
  Site,
  SiteFormData,
  CreateSiteData,
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

  const handleCreateSiteSubmit = async (formData: SiteFormData) => {
    const nextSiteNumber = sites.length + 1;
    const newSite: CreateSiteData = {
      river_walk_id: riverWalk.id,
      site_number: nextSiteNumber,
      site_name: formData.site_name,
      river_width: parseFloat(formData.river_width),
    };

    await handleCreateSite(newSite);
    setShowSiteForm(false);
  };

  const handleUpdateSiteSubmit = async (formData: SiteFormData) => {
    if (!editingSite) return;

    await handleUpdateSite(
      editingSite.id,
      {
        site_name: formData.site_name,
        river_width: parseFloat(formData.river_width),
      },
      riverWalk.id
    );
    setEditingSite(null);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Manage Sites - {riverWalk.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

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

        {editingSite ? (
          <SiteForm
            editingSite={editingSite}
            onSubmit={handleUpdateSiteSubmit}
            onCancel={() => setEditingSite(null)}
            loading={loading}
          />
        ) : editingMeasurements ? (
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
            onEditSite={setEditingSite}
            onDeleteSite={handleDeleteSiteWithConfirm}
            onAddNewSite={() => setShowSiteForm(true)}
          />
        )}
      </div>
    </div>
  );
}
