import { supabase } from '../supabase';

// Get all river walks for the current user
export async function getRiverWalks() {
  const { data, error } = await supabase
    .from('river_walks')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching river walks:', error);
    throw error;
  }

  return data || [];
}

// Get a single river walk by ID
export async function getRiverWalkById(id) {
  const { data, error } = await supabase
    .from('river_walks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching river walk with id ${id}:`, error);
    throw error;
  }

  return data;
}

// Create a new river walk
export async function createRiverWalk(riverWalkData) {
  // Get the current user ID
  const { data: { session } } = await supabase.auth.getSession();
  
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
export async function updateRiverWalk(id, riverWalkData) {
  const { data, error } = await supabase
    .from('river_walks')
    .update({
      ...riverWalkData,
      updated_at: new Date().toISOString()
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

// Delete a river walk
export async function deleteRiverWalk(id) {
  const { error } = await supabase
    .from('river_walks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting river walk with id ${id}:`, error);
    throw error;
  }

  return true;
}