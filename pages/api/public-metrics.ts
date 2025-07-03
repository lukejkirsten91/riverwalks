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

    // Get total river walks (excluding archived)
    const { count: riverWalkCount, error: riverWalkError } = await supabaseAdmin
      .from('river_walks')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false);

    if (riverWalkError) {
      console.error('Error fetching river walks:', riverWalkError);
      throw riverWalkError;
    }

    // Get total sites
    const { count: siteCount, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact', head: true });

    if (siteError) {
      console.error('Error fetching sites:', siteError);
      throw siteError;
    }

    // Get total measurement points
    const { count: measurementCount, error: measurementError } = await supabaseAdmin
      .from('measurement_points')
      .select('*', { count: 'exact', head: true });

    if (measurementError) {
      console.error('Error fetching measurements:', measurementError);
      throw measurementError;
    }

    // Calculate total area studied (sum of cross-sectional areas)
    const { data: sitesData, error: sitesDataError } = await supabaseAdmin
      .from('sites')
      .select('river_width')
      .not('river_width', 'is', null);

    if (sitesDataError) {
      console.error('Error fetching site widths:', sitesDataError);
      throw sitesDataError;
    }

    // Calculate total area (simple approximation: width * 1m depth average)
    const totalAreaSquareMeters = sitesData?.reduce((total, site) => {
      return total + (parseFloat(site.river_width) || 0);
    }, 0) || 0;

    // Get sites with coordinates for map
    const { data: coordinatesData, error: coordinatesError } = await supabaseAdmin
      .from('sites')
      .select('latitude, longitude, site_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

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

    // Set cache headers for reasonable caching (5 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(metrics);

  } catch (error) {
    console.error('Error fetching public metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}