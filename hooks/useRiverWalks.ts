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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const fetchRiverWalks = async () => {
    try {
      setLoading(true);
      const [activeData, archivedData] = await Promise.all([
        getRiverWalks(false),
        getArchivedRiverWalks()
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
      showSuccess(`${formData.name} created`);
    } catch (err) {
      const errorMessage = 'Failed to create river walk';
      setError(errorMessage);
      showError('Could not create river walk');
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
      showSuccess(`${riverWalk?.name || 'River walk'} archived`);
    } catch (err) {
      const errorMessage = 'Failed to archive river walk';
      setError(errorMessage);
      showError('Could not archive');
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
      showSuccess(`${riverWalk?.name || 'River walk'} restored`);
    } catch (err) {
      const errorMessage = 'Failed to restore river walk';
      setError(errorMessage);
      showError('Could not restore');
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
      showSuccess(`${riverWalk?.name || 'River walk'} deleted`);
    } catch (err) {
      const errorMessage = 'Failed to delete river walk';
      setError(errorMessage);
      showError('Could not delete');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiverWalks();
  }, []);

  return {
    riverWalks,
    archivedRiverWalks,
    loading,
    error,
    setError,
    fetchRiverWalks,
    handleCreateRiverWalk,
    handleUpdateRiverWalk,
    handleArchiveRiverWalk,
    handleRestoreRiverWalk,
    handleDeleteRiverWalk,
  };
}
