// pages/api/test-data.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSitesForRiverWalk } from '../../lib/api/sites';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { riverWalkId } = req.query;
  
  if (!riverWalkId || typeof riverWalkId !== 'string') {
    return res.status(400).json({ error: 'River walk ID is required' });
  }

  try {
    console.log('🔍 Testing data fetch for river walk ID:', riverWalkId);
    
    // Fetch river walk data
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('id', riverWalkId)
      .maybeSingle();

    // Fetch sites using the same function as frontend
    const sites = await getSitesForRiverWalk(riverWalkId);

    const result = {
      riverWalk: {
        id: riverWalk?.id,
        name: riverWalk?.name,
        date: riverWalk?.date,
        county: riverWalk?.county,
        country: riverWalk?.country,
        notes: riverWalk?.notes,
        error: riverWalkError?.message
      },
      sites: sites.map(site => ({
        id: site.id,
        site_number: site.site_number,
        site_name: site.site_name,
        river_width: site.river_width,
        measurement_points_count: site.measurement_points?.length || 0,
        measurement_points: site.measurement_points,
        has_velocity_data: !!site.velocity_data,
        velocity_data: site.velocity_data,
        notes: site.notes,
        weather_conditions: site.weather_conditions,
        land_use: site.land_use
      })),
      debug: {
        riverWalkFound: !!riverWalk,
        sitesCount: sites.length,
        firstSiteHasMeasurements: sites.length > 0 ? (sites[0]?.measurement_points?.length || 0) > 0 : false,
        firstSiteHasVelocity: sites.length > 0 ? !!(sites[0]?.velocity_data?.measurements?.length) : false
      }
    };

    console.log('📊 Test data result:', result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Test data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}