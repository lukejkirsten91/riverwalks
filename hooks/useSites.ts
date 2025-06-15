import { useState } from 'react';
import {
  getSitesForRiverWalk,
  createSite,
  updateSite,
  deleteSite,
} from '../lib/api/sites';
import type { Site, CreateSiteData, UpdateSiteData } from '../types';

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = async (riverWalkId: string) => {
    try {
      setLoading(true);
      const sitesData = await getSitesForRiverWalk(riverWalkId);
      setSites(sitesData);
    } catch (err) {
      setError('Failed to load sites');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (siteData: CreateSiteData) => {
    try {
      setLoading(true);
      await createSite(siteData);
      await fetchSites(siteData.river_walk_id);
    } catch (err) {
      setError('Failed to create site');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSite = async (
    siteId: string,
    siteData: UpdateSiteData,
    riverWalkId: string
  ) => {
    try {
      setLoading(true);
      await updateSite(siteId, siteData);
      await fetchSites(riverWalkId);
    } catch (err) {
      setError('Failed to update site');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string, riverWalkId: string) => {
    try {
      setLoading(true);
      await deleteSite(siteId);
      await fetchSites(riverWalkId);
    } catch (err) {
      setError('Failed to delete site');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearSites = () => {
    setSites([]);
    setError(null);
  };

  return {
    sites,
    loading,
    error,
    setError,
    fetchSites,
    handleCreateSite,
    handleUpdateSite,
    handleDeleteSite,
    clearSites,
  };
}
