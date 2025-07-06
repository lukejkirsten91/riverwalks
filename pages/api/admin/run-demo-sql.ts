import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured');
    }

    // Step 1: Create river walk
    const { error: riverWalkError } = await supabaseAdmin
      .from('river_walks')
      .upsert({
        id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        name: 'River Dart Interactive Demo',
        date: '2024-06-15',
        country: 'UK',
        county: 'Devon',
        user_id: '64ff3cca-bdab-408f-806b-c42e755cef53',
        archived: false,
        notes: 'Demonstration river walk for interactive preview feature. Contains 5 pre-filled sites with realistic data from the River Dart in Devon.'
      });

    if (riverWalkError) {
      console.error('River walk error:', riverWalkError);
      throw riverWalkError;
    }

    // Step 2: Create sites
    const sites = [
      {
        id: '11b74132-9613-41f3-a4b0-7f8196c23c11',
        river_walk_id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        site_number: 1,
        site_name: 'Upstream Meadow',
        river_width: 3.2,
        latitude: 50.5547,
        longitude: -3.7281,
        notes: 'Shallow section with gravel bed, moderate flow through open meadowland',
        todo_site_info_status: 'complete',
        todo_cross_section_status: 'complete',
        todo_velocity_status: 'complete',
        todo_sediment_status: 'complete',
        velocity_data: {
          measurements: [
            { time: 12.5, distance: 10, velocity: 0.8 },
            { time: 11.8, distance: 10, velocity: 0.85 },
            { time: 13.2, distance: 10, velocity: 0.76 }
          ],
          average_velocity: 0.35
        },
        sedimentation_data: {
          measurements: [
            { size_mm: 45, roundness: 3, point: 1 },
            { size_mm: 52, roundness: 4, point: 2 },
            { size_mm: 38, roundness: 3, point: 3 }
          ]
        }
      },
      {
        id: 'bf4f8cf8-c76b-451e-af85-1259decd0898',
        river_walk_id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        site_number: 2,
        site_name: 'Bridge Crossing',
        river_width: 2.8,
        latitude: 50.5532,
        longitude: -3.7295,
        notes: 'Narrower channel under stone bridge, deeper water with faster flow',
        todo_site_info_status: 'complete',
        todo_cross_section_status: 'complete',
        todo_velocity_status: 'complete',
        todo_sediment_status: 'complete',
        velocity_data: {
          measurements: [
            { time: 8.2, distance: 10, velocity: 1.22 },
            { time: 7.9, distance: 10, velocity: 1.27 },
            { time: 8.5, distance: 10, velocity: 1.18 }
          ],
          average_velocity: 0.58
        },
        sedimentation_data: {
          measurements: [
            { size_mm: 128, roundness: 2, point: 1 },
            { size_mm: 156, roundness: 2, point: 2 },
            { size_mm: 142, roundness: 3, point: 3 }
          ]
        }
      },
      {
        id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0',
        river_walk_id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        site_number: 3,
        site_name: 'Wooded Bend',
        river_width: 4.1,
        latitude: 50.5518,
        longitude: -3.7312,
        notes: 'Wide meander through woodland, shallower with leaf litter on banks',
        todo_site_info_status: 'complete',
        todo_cross_section_status: 'complete',
        todo_velocity_status: 'complete',
        todo_sediment_status: 'complete',
        velocity_data: {
          measurements: [
            { time: 18.5, distance: 10, velocity: 0.54 },
            { time: 19.2, distance: 10, velocity: 0.52 },
            { time: 17.8, distance: 10, velocity: 0.56 }
          ],
          average_velocity: 0.22
        },
        sedimentation_data: {
          measurements: [
            { size_mm: 8, roundness: 4, point: 1 },
            { size_mm: 12, roundness: 5, point: 2 },
            { size_mm: 6, roundness: 4, point: 3 }
          ]
        }
      },
      {
        id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae',
        river_walk_id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        site_number: 4,
        site_name: 'Rocky Rapids',
        river_width: 2.5,
        latitude: 50.5503,
        longitude: -3.7328,
        notes: 'Steep rocky section with turbulent flow over granite boulders',
        todo_site_info_status: 'complete',
        todo_cross_section_status: 'complete',
        todo_velocity_status: 'complete',
        todo_sediment_status: 'complete',
        velocity_data: {
          measurements: [
            { time: 6.1, distance: 10, velocity: 1.64 },
            { time: 5.8, distance: 10, velocity: 1.72 },
            { time: 6.4, distance: 10, velocity: 1.56 }
          ],
          average_velocity: 0.84
        },
        sedimentation_data: {
          measurements: [
            { size_mm: 380, roundness: 1, point: 1 },
            { size_mm: 425, roundness: 2, point: 2 },
            { size_mm: 356, roundness: 1, point: 3 }
          ]
        }
      },
      {
        id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6',
        river_walk_id: '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        site_number: 5,
        site_name: 'Village Outflow',
        river_width: 3.8,
        latitude: 50.5489,
        longitude: -3.7345,
        notes: 'Wider section downstream of village, silty bed with slower flow',
        todo_site_info_status: 'complete',
        todo_cross_section_status: 'complete',
        todo_velocity_status: 'complete',
        todo_sediment_status: 'complete',
        velocity_data: {
          measurements: [
            { time: 14.8, distance: 10, velocity: 0.68 },
            { time: 15.2, distance: 10, velocity: 0.66 },
            { time: 14.5, distance: 10, velocity: 0.69 }
          ],
          average_velocity: 0.41
        },
        sedimentation_data: {
          measurements: [
            { size_mm: 1.2, roundness: 5, point: 1 },
            { size_mm: 0.8, roundness: 6, point: 2 },
            { size_mm: 1.5, roundness: 5, point: 3 }
          ]
        }
      }
    ];

    const { error: sitesError } = await supabaseAdmin
      .from('sites')
      .upsert(sites);

    if (sitesError) {
      console.error('Sites error:', sitesError);
      throw sitesError;
    }

    // Step 3: Create measurement points
    const measurementPoints = [
      // Site 1 measurements
      { site_id: '11b74132-9613-41f3-a4b0-7f8196c23c11', point_number: 1, distance_from_bank: 0, depth: 0 },
      { site_id: '11b74132-9613-41f3-a4b0-7f8196c23c11', point_number: 2, distance_from_bank: 0.8, depth: 0.4 },
      { site_id: '11b74132-9613-41f3-a4b0-7f8196c23c11', point_number: 3, distance_from_bank: 1.6, depth: 0.8 },
      { site_id: '11b74132-9613-41f3-a4b0-7f8196c23c11', point_number: 4, distance_from_bank: 2.4, depth: 0.6 },
      { site_id: '11b74132-9613-41f3-a4b0-7f8196c23c11', point_number: 5, distance_from_bank: 3.2, depth: 0 },
      // Site 2 measurements
      { site_id: 'bf4f8cf8-c76b-451e-af85-1259decd0898', point_number: 1, distance_from_bank: 0, depth: 0 },
      { site_id: 'bf4f8cf8-c76b-451e-af85-1259decd0898', point_number: 2, distance_from_bank: 0.7, depth: 0.6 },
      { site_id: 'bf4f8cf8-c76b-451e-af85-1259decd0898', point_number: 3, distance_from_bank: 1.4, depth: 1.2 },
      { site_id: 'bf4f8cf8-c76b-451e-af85-1259decd0898', point_number: 4, distance_from_bank: 2.1, depth: 0.8 },
      { site_id: 'bf4f8cf8-c76b-451e-af85-1259decd0898', point_number: 5, distance_from_bank: 2.8, depth: 0 },
      // Site 3 measurements
      { site_id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', point_number: 1, distance_from_bank: 0, depth: 0 },
      { site_id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', point_number: 2, distance_from_bank: 1.0, depth: 0.3 },
      { site_id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', point_number: 3, distance_from_bank: 2.0, depth: 0.7 },
      { site_id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', point_number: 4, distance_from_bank: 3.1, depth: 0.5 },
      { site_id: '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', point_number: 5, distance_from_bank: 4.1, depth: 0 },
      // Site 4 measurements
      { site_id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae', point_number: 1, distance_from_bank: 0, depth: 0 },
      { site_id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae', point_number: 2, distance_from_bank: 0.6, depth: 0.5 },
      { site_id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae', point_number: 3, distance_from_bank: 1.25, depth: 0.9 },
      { site_id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae', point_number: 4, distance_from_bank: 1.9, depth: 0.4 },
      { site_id: 'be6d91b3-71da-4882-840a-a8d2f29b8dae', point_number: 5, distance_from_bank: 2.5, depth: 0 },
      // Site 5 measurements
      { site_id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', point_number: 1, distance_from_bank: 0, depth: 0 },
      { site_id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', point_number: 2, distance_from_bank: 0.95, depth: 0.4 },
      { site_id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', point_number: 3, distance_from_bank: 1.9, depth: 0.8 },
      { site_id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', point_number: 4, distance_from_bank: 2.85, depth: 0.6 },
      { site_id: '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', point_number: 5, distance_from_bank: 3.8, depth: 0 }
    ];

    const { error: measurementError } = await supabaseAdmin
      .from('measurement_points')
      .upsert(measurementPoints);

    if (measurementError) {
      console.error('Measurement points error:', measurementError);
      throw measurementError;
    }

    // Verify the data was created
    const { data: verifyRiverWalk } = await supabaseAdmin
      .from('river_walks')
      .select('*')
      .eq('id', '72618ab0-5079-43e3-a4ea-bbdb773196d9')
      .single();

    const { data: verifySites } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('river_walk_id', '72618ab0-5079-43e3-a4ea-bbdb773196d9');

    const { data: verifyMeasurements } = await supabaseAdmin
      .from('measurement_points')
      .select('*')
      .in('site_id', sites.map(s => s.id));

    console.log('Demo data created successfully:', {
      riverWalk: verifyRiverWalk,
      sitesCount: verifySites?.length,
      measurementsCount: verifyMeasurements?.length
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Demo data created successfully',
      data: {
        riverWalk: verifyRiverWalk,
        sitesCount: verifySites?.length,
        measurementsCount: verifyMeasurements?.length
      }
    });

  } catch (error) {
    console.error('Error creating demo data:', error);
    return res.status(500).json({ 
      error: 'Failed to create demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}