import { supabase } from '../supabase';
import type { Site, CreateSiteData, UpdateSiteData, CreateMeasurementPointData } from '../../types';

// Get all sites for a specific river walk
export async function getSitesForRiverWalk(riverWalkId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select(`
      *,
      measurement_points(*)
    `)
    .eq('river_walk_id', riverWalkId)
    .order('site_number', { ascending: true });

  if (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }

  return data || [];
}

// Get a single site by ID with its measurement points
export async function getSiteById(siteId: string): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .select(`
      *,
      measurement_points(*)
    `)
    .eq('id', siteId)
    .single();

  if (error) {
    console.error(`Error fetching site with id ${siteId}:`, error);
    throw error;
  }

  return data;
}

// Create a new site
export async function createSite(siteData: CreateSiteData): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .insert([{
      ...siteData,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return data;
}

// Update an existing site
export async function updateSite(siteId: string, siteData: UpdateSiteData): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .update({
      ...siteData,
      updated_at: new Date().toISOString()
    })
    .eq('id', siteId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating site with id ${siteId}:`, error);
    throw error;
  }

  return data;
}

// Delete a site (this will also delete all associated measurement points due to CASCADE)
export async function deleteSite(siteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', siteId);

  if (error) {
    console.error(`Error deleting site with id ${siteId}:`, error);
    throw error;
  }

  return true;
}

// Create a measurement point for a site
export async function createMeasurementPoint(pointData: CreateMeasurementPointData & { site_id: string }): Promise<any> {
  const { data, error } = await supabase
    .from('measurement_points')
    .insert([pointData])
    .select()
    .single();

  if (error) {
    console.error('Error creating measurement point:', error);
    throw error;
  }

  return data;
}

// Update a measurement point
export async function updateMeasurementPoint(pointId: string, pointData: Partial<CreateMeasurementPointData>): Promise<any> {
  const { data, error } = await supabase
    .from('measurement_points')
    .update(pointData)
    .eq('id', pointId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating measurement point with id ${pointId}:`, error);
    throw error;
  }

  return data;
}

// Delete a measurement point
export async function deleteMeasurementPoint(pointId: string): Promise<boolean> {
  const { error } = await supabase
    .from('measurement_points')
    .delete()
    .eq('id', pointId);

  if (error) {
    console.error(`Error deleting measurement point with id ${pointId}:`, error);
    throw error;
  }

  return true;
}

// Bulk create measurement points for a site
export async function createMeasurementPoints(siteId: string, points: CreateMeasurementPointData[]): Promise<any[]> {
  const pointsWithSiteId = points.map(point => ({
    ...point,
    site_id: siteId
  }));

  const { data, error } = await supabase
    .from('measurement_points')
    .insert(pointsWithSiteId)
    .select();

  if (error) {
    console.error('Error creating measurement points:', error);
    throw error;
  }

  return data;
}

// Delete all measurement points for a site
export async function deleteMeasurementPointsForSite(siteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('measurement_points')
    .delete()
    .eq('site_id', siteId);

  if (error) {
    console.error(`Error deleting measurement points for site ${siteId}:`, error);
    throw error;
  }

  return true;
}