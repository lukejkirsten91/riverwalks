import { useState, useEffect } from 'react';
import {
  getRiverWalks,
  getArchivedRiverWalks,
  getRiverWalksByDateRange,
  createRiverWalk,
  updateRiverWalk,
  archiveRiverWalk,
  restoreRiverWalk,
  deleteRiverWalk,
} from '../lib/api/river-walks';
import { useToast } from '../components/ui/ToastProvider';
import type { RiverWalk, RiverWalkFormData } from '../types';

export function useRiverWalks() {
  const [riverWalks, setRiverWalks] = useState<RiverWalk[]>([]);
  const [archivedRiverWalks, setArchivedRiverWalks] = useState<RiverWalk[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'date_created'>('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const fetchRiverWalks = async () => {
    try {
      setLoading(true);
      const [activeData, archivedData] = await Promise.all([
        getRiverWalks(false, sortBy),
        getArchivedRiverWalks(sortBy)
      ]);
      setRiverWalks(activeData);
      setArchivedRiverWalks(archivedData);
    } catch (err) {
      setError('Failed to load river walks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRiverWalk = async (formData: RiverWalkFormData) => {
    try {
      setLoading(true);
      await createRiverWalk(formData);
      await fetchRiverWalks();
      showSuccess('River Walk Created', `${formData.name} has been successfully created.`);
    } catch (err) {
      const errorMessage = 'Failed to create river walk';
      setError(errorMessage);
      showError('Creation Failed', errorMessage);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRiverWalk = async (
    id: string,
    formData: RiverWalkFormData
  ) => {
    try {
      setLoading(true);
      await updateRiverWalk(id, formData);
      await fetchRiverWalks();
    } catch (err) {
      setError('Failed to update river walk');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveRiverWalk = async (id: string) => {
    try {
      setLoading(true);
      const riverWalk = riverWalks.find(rw => rw.id === id);
      await archiveRiverWalk(id);
      await fetchRiverWalks();
      showSuccess('River Walk Archived', `${riverWalk?.name || 'River walk'} has been archived.`);
    } catch (err) {
      const errorMessage = 'Failed to archive river walk';
      setError(errorMessage);
      showError('Archive Failed', errorMessage);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRiverWalk = async (id: string) => {
    try {
      setLoading(true);
      const riverWalk = archivedRiverWalks.find(rw => rw.id === id);
      await restoreRiverWalk(id);
      await fetchRiverWalks();
      showSuccess('River Walk Restored', `${riverWalk?.name || 'River walk'} has been restored.`);
    } catch (err) {
      const errorMessage = 'Failed to restore river walk';
      setError(errorMessage);
      showError('Restore Failed', errorMessage);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRiverWalk = async (id: string) => {
    try {
      setLoading(true);
      const riverWalk = archivedRiverWalks.find(rw => rw.id === id);
      await deleteRiverWalk(id);
      await fetchRiverWalks();
      showSuccess('River Walk Deleted', `${riverWalk?.name || 'River walk'} has been permanently deleted.`);
    } catch (err) {
      const errorMessage = 'Failed to delete river walk';
      setError(errorMessage);
      showError('Delete Failed', errorMessage);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeFilter = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      const filteredData = await getRiverWalksByDateRange(
        startDate, 
        endDate, 
        sortBy, 
        showArchived
      );
      if (showArchived) {
        setArchivedRiverWalks(filteredData);
      } else {
        setRiverWalks(filteredData);
      }
    } catch (err) {
      setError('Failed to filter river walks by date range');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiverWalks();
  }, [sortBy]);

  return {
    riverWalks,
    archivedRiverWalks,
    showArchived,
    setShowArchived,
    sortBy,
    setSortBy,
    loading,
    error,
    setError,
    fetchRiverWalks,
    handleDateRangeFilter,
    handleCreateRiverWalk,
    handleUpdateRiverWalk,
    handleArchiveRiverWalk,
    handleRestoreRiverWalk,
    handleDeleteRiverWalk,
  };
}
