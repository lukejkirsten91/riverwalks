import { useState, useEffect } from 'react';
import {
  getRiverWalks,
  createRiverWalk,
  updateRiverWalk,
  deleteRiverWalk,
} from '../lib/api/river-walks';
import type { RiverWalk, RiverWalkFormData } from '../types';

export function useRiverWalks() {
  const [riverWalks, setRiverWalks] = useState<RiverWalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiverWalks = async () => {
    try {
      setLoading(true);
      const data = await getRiverWalks();
      setRiverWalks(data);
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
    loading,
    error,
    setError,
    fetchRiverWalks,
    handleCreateRiverWalk,
    handleUpdateRiverWalk,
    handleDeleteRiverWalk,
  };
}
