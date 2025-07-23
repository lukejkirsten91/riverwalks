import { supabase } from '../supabase';
import { offlineDataService } from '../offlineDataService';
import type { RiverWalk, RiverWalkFormData } from '../../types';

// Get all river walks for the current user (excluding archived by default)
export async function getRiverWalks(
  includeArchived = false, 
  sortBy: 'date' | 'date_created' = 'date'
): Promise<RiverWalk[]> {
  let query = supabase
    .from('river_walks')
    .select('*');

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  const { data, error } = await query.order(sortBy, { ascending: false });

  if (error) {
    console.error('Error fetching river walks:', error);
    throw error;
  }

  return data || [];
}

// Get only archived river walks for the current user
export async function getArchivedRiverWalks(
  sortBy: 'date' | 'date_created' = 'date'
): Promise<RiverWalk[]> {
  const { data, error } = await supabase
    .from('river_walks')
    .select('*')
    .eq('archived', true)
    .order(sortBy, { ascending: false });

  if (error) {
    console.error('Error fetching archived river walks:', error);
    throw error;
  }

  return data || [];
}

// Get a single river walk by ID (offline-aware)
export async function getRiverWalkById(id: string): Promise<RiverWalk> {
  try {
    // First try to get all river walks from offline service (includes online fetch + cache)
    const allRiverWalks = await offlineDataService.getRiverWalks();
    
    // Find the specific river walk by ID
    const riverWalk = allRiverWalks.find(rw => rw.id === id);
    
    if (!riverWalk) {
      throw new Error(`River walk with id ${id} not found`);
    }
    
    return riverWalk;
  } catch (error) {
    console.error(`Error fetching river walk with id ${id}:`, error);
    throw error;
  }
}

// Create a new river walk
export async function createRiverWalk(
  riverWalkData: RiverWalkFormData
): Promise<RiverWalk> {
  // Get the current user ID
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to create a river walk');
  }

  // Prepare the data
  const newRiverWalk = {
    ...riverWalkData,
    user_id: session.user.id,
    country: riverWalkData.country || 'UK',
  };

  // Insert into the database
  const { data, error } = await supabase
    .from('river_walks')
    .insert([newRiverWalk])
    .select()
    .single();

  if (error) {
    console.error('Error creating river walk:', error);
    throw error;
  }

  return data;
}

// Update an existing river walk
export async function updateRiverWalk(
  id: string,
  riverWalkData: RiverWalkFormData
): Promise<RiverWalk> {
  const { data, error } = await supabase
    .from('river_walks')
    .update({
      ...riverWalkData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating river walk with id ${id}:`, error);
    throw error;
  }

  return data;
}

// Archive a river walk (soft delete)
export async function archiveRiverWalk(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('river_walks')
    .update({ 
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(`Error archiving river walk with id ${id}:`, error);
    throw error;
  }

  return true;
}

// Restore a river walk from archive
export async function restoreRiverWalk(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('river_walks')
    .update({ 
      archived: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(`Error restoring river walk with id ${id}:`, error);
    throw error;
  }

  return true;
}

// Delete a river walk permanently
export async function deleteRiverWalk(id: string): Promise<boolean> {
  const { error } = await supabase.from('river_walks').delete().eq('id', id);

  if (error) {
    console.error(`Error deleting river walk with id ${id}:`, error);
    throw error;
  }

  return true;
}

// Get river walks filtered by date range
export async function getRiverWalksByDateRange(
  startDate: string,
  endDate: string,
  dateField: 'date' | 'date_created' = 'date',
  includeArchived = false
): Promise<RiverWalk[]> {
  let query = supabase
    .from('river_walks')
    .select('*')
    .gte(dateField, startDate)
    .lte(dateField, endDate);

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  const { data, error } = await query.order(dateField, { ascending: false });

  if (error) {
    console.error('Error fetching river walks by date range:', error);
    throw error;
  }

  return data || [];
}
