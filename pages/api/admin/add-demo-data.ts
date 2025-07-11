import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin check - only allow luke.kirsten@gmail.com
  const { email } = req.body;
  if (email !== 'luke.kirsten@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID first
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    const user = userData.users.find(u => u.email === 'luke.kirsten@gmail.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create river walk
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .insert({
        user_id: user.id,
        river_name: 'River Dart Study',
        location: 'Dartmoor National Park, Devon',
        study_date: '2024-09-15',
        weather_conditions: 'Overcast, light breeze, 16°C - ideal conditions for river study',
        group_size: 4
      })
      .select()
      .single();

    if (riverWalkError) throw riverWalkError;

    // Create sites
    const sitesData = [
      {
        river_walk_id: riverWalk.id,
        site_name: 'Upstream Site',
        description: 'Upper reaches near Dartmoor, fast flowing over granite bedrock',
        latitude: 50.5812,
        longitude: -3.9234,
        river_width: 3.2,
        notes: 'Rocky riverbed with large granite boulders. Water very clear. Some small trout observed.'
      },
      {
        river_walk_id: riverWalk.id,
        site_name: 'Middle Reach',
        description: 'Meandering section through mixed woodland and farmland',
        latitude: 50.5623,
        longitude: -3.8967,
        river_width: 5.8,
        notes: 'Riverbed of mixed pebbles and sand. Some erosion on outer meander bends. Evidence of cattle access.'
      },
      {
        river_walk_id: riverWalk.id,
        site_name: 'Downstream Site',
        description: 'Lower reaches before confluence with River Dart main channel',
        latitude: 50.5445,
        longitude: -3.8701,
        river_width: 8.1,
        notes: 'Wider, slower flowing section. Muddy banks with vegetation. Some pollution from agricultural runoff evident.'
      }
    ];

    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .insert(sitesData)
      .select();

    if (sitesError) throw sitesError;

    // Create measurement points for each site
    const measurementPoints = [
      // Site 1 (Upstream) measurements
      ...Array.from({ length: 9 }, (_, i) => ({
        site_id: sites[0].id,
        point_number: i + 1,
        distance_from_bank: i * 0.4,
        depth: [0.05, 0.12, 0.28, 0.45, 0.52, 0.41, 0.26, 0.15, 0.03][i]
      })),
      // Site 2 (Middle) measurements  
      ...Array.from({ length: 10 }, (_, i) => ({
        site_id: sites[1].id,
        point_number: i + 1,
        distance_from_bank: i * 0.64,
        depth: [0.02, 0.08, 0.19, 0.32, 0.41, 0.38, 0.27, 0.16, 0.09, 0.01][i]
      })),
      // Site 3 (Downstream) measurements
      ...Array.from({ length: 12 }, (_, i) => ({
        site_id: sites[2].id,
        point_number: i + 1,
        distance_from_bank: i * 0.675,
        depth: [0.01, 0.06, 0.14, 0.23, 0.35, 0.42, 0.39, 0.31, 0.22, 0.13, 0.07, 0.02][i]
      }))
    ];

    const { data: measurements, error: measurementsError } = await supabase
      .from('measurement_points')
      .insert(measurementPoints);

    if (measurementsError) throw measurementsError;

    return res.status(200).json({
      success: true,
      message: 'Demo data added successfully',
      riverWalk: riverWalk,
      sites: sites,
      measurementPointsCount: measurementPoints.length
    });

  } catch (error) {
    console.error('Error adding demo data:', error);
    return res.status(500).json({
      error: 'Failed to add demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}