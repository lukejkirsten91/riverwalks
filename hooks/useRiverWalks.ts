import { useState, useEffect } from 'react';
import {
  getRiverWalks,
  getArchivedRiverWalks,
  createRiverWalk,
  updateRiverWalk,
  archiveRiverWalk,
  restoreRiverWalk,
  deleteRiverWalk,
} from '../lib/api/river-walks';
import type { RiverWalk, RiverWalkFormData } from '../types';

export function useRiverWalks() {
  const [riverWalks, setRiverWalks] = useState<RiverWalk[]>([]);
  const [archivedRiverWalks, setArchivedRiverWalks] = useState<RiverWalk[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError('Failed to create river walk');
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
      await archiveRiverWalk(id);
      await fetchRiverWalks();
    } catch (err) {
      setError('Failed to archive river walk');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRiverWalk = async (id: string) => {
    try {
      setLoading(true);
      await restoreRiverWalk(id);
      await fetchRiverWalks();
    } catch (err) {
      setError('Failed to restore river walk');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRiverWalk = async (id: string) => {
    try {
      setLoading(true);
      await deleteRiverWalk(id);
      await fetchRiverWalks();
    } catch (err) {
      setError('Failed to delete river walk');
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
    showArchived,
    setShowArchived,
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
