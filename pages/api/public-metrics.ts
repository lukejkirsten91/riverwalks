import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create service role client for public metrics (bypass RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured');
    }

    // Exclude demo/test data from metrics
    const excludeTestEmails = ['demo@riverwalks.co.uk'];
    
    // Get user IDs to exclude
    let excludeUserIds: string[] = [];
    try {
      const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) {
        console.error('Error fetching users for filtering:', usersError);
      } else {
        excludeUserIds = allUsers?.users
          ?.filter(u => excludeTestEmails.includes(u.email || ''))
          ?.map(u => u.id) || [];
        console.log('Excluding user IDs:', excludeUserIds);
      }
    } catch (error) {
      console.error('Could not filter demo users, including all data:', error);
    }

    // First get valid river walk IDs (excluding archived and demo/test data)
    let validRiverWalkQuery = supabaseAdmin
      .from('river_walks')
      .select('id')
      .eq('archived', false);
    
    if (excludeUserIds.length > 0) {
      validRiverWalkQuery = validRiverWalkQuery.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
    }
    
    const { data: validRiverWalks, error: riverWalkError } = await validRiverWalkQuery;

    if (riverWalkError) {
      console.error('Error fetching river walks:', riverWalkError);
      throw riverWalkError;
    }

    const riverWalkCount = validRiverWalks?.length || 0;
    const validRiverWalkIds = validRiverWalks?.map(rw => rw.id) || [];

    // Get total sites (from valid river walks only)
    let siteQuery = supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact', head: true });
    
    if (validRiverWalkIds.length > 0) {
      siteQuery = siteQuery.in('river_walk_id', validRiverWalkIds);
    } else {
      // No valid river walks, so no sites
      siteQuery = siteQuery.eq('id', 'never-matches');
    }
    
    const { count: siteCount, error: siteError } = await siteQuery;

    if (siteError) {
      console.error('Error fetching sites:', siteError);
      throw siteError;
    }

    // Get valid site IDs first
    let validSiteQuery = supabaseAdmin
      .from('sites')
      .select('id');
    
    if (validRiverWalkIds.length > 0) {
      validSiteQuery = validSiteQuery.in('river_walk_id', validRiverWalkIds);
    } else {
      validSiteQuery = validSiteQuery.eq('id', 'never-matches');
    }
    
    const { data: validSites, error: validSitesError } = await validSiteQuery;
    
    if (validSitesError) {
      console.error('Error fetching valid sites:', validSitesError);
      throw validSitesError;
    }
    
    const validSiteIds = validSites?.map(s => s.id) || [];

    // Get total measurement points (from valid sites only)
    let measurementQuery = supabaseAdmin
      .from('measurement_points')
      .select('*', { count: 'exact', head: true });
    
    if (validSiteIds.length > 0) {
      measurementQuery = measurementQuery.in('site_id', validSiteIds);
    } else {
      measurementQuery = measurementQuery.eq('id', 'never-matches');
    }
    
    const { count: measurementCount, error: measurementError } = await measurementQuery;

    if (measurementError) {
      console.error('Error fetching measurements:', measurementError);
      throw measurementError;
    }

    // Calculate total area studied (from valid sites only)
    let areaSitesQuery = supabaseAdmin
      .from('sites')
      .select('river_width')
      .not('river_width', 'is', null);
    
    if (validSiteIds.length > 0) {
      areaSitesQuery = areaSitesQuery.in('id', validSiteIds);
    } else {
      areaSitesQuery = areaSitesQuery.eq('id', 'never-matches');
    }

    const { data: sitesData, error: sitesDataError } = await areaSitesQuery;

    if (sitesDataError) {
      console.error('Error fetching site widths:', sitesDataError);
      throw sitesDataError;
    }

    // Calculate total area (simple approximation: width * 1m depth average)
    const totalAreaSquareMeters = sitesData?.reduce((total, site) => {
      return total + (parseFloat(site.river_width) || 0);
    }, 0) || 0;

    // Get sites with coordinates for map (from valid sites only)
    let coordinatesQuery = supabaseAdmin
      .from('sites')
      .select('latitude, longitude, site_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (validSiteIds.length > 0) {
      coordinatesQuery = coordinatesQuery.in('id', validSiteIds);
    } else {
      coordinatesQuery = coordinatesQuery.eq('id', 'never-matches');
    }
    
    const { data: coordinatesData, error: coordinatesError } = await coordinatesQuery;

    if (coordinatesError) {
      console.error('Error fetching coordinates:', coordinatesError);
      throw coordinatesError;
    }

    const metrics = {
      riverWalks: riverWalkCount || 0,
      measurementSites: siteCount || 0,
      totalMeasurements: measurementCount || 0,
      areaStudiedSquareMeters: Math.round(totalAreaSquareMeters),
      sitesWithCoordinates: coordinatesData || [],
      lastUpdated: new Date().toISOString()
    };

    // No caching - always fetch fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).json(metrics);

  } catch (error) {
    console.error('Error fetching public metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}