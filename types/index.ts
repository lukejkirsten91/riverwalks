// Database types
export interface RiverWalk {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  date: string;
  country: string;
  county: string | null;
  user_id: string;
  archived: boolean;
  notes: string | null;
}

export interface Site {
  id: string;
  river_walk_id: string;
  site_number: number;
  site_name: string;
  river_width: number;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  notes: string | null;
  weather_conditions: string | null;
  land_use: string | null;
  depth_units: UnitType;
  sedimentation_units: UnitType;
  sedimentation_photo_url: string | null;
  sedimentation_data: SedimentationData | null;
  created_at: string;
  updated_at: string;
  measurement_points?: MeasurementPoint[];
}

export interface MeasurementPoint {
  id: string;
  site_id: string;
  point_number: number;
  distance_from_bank: number;
  depth: number;
  created_at: string;
}

// Form data types
export interface RiverWalkFormData {
  name: string;
  date: string;
  country: string;
  county: string;
  notes?: string;
}

export type UnitType = 'm' | 'cm' | 'mm' | 'ft' | 'in' | 'yd';

export interface SiteFormData {
  site_name: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  weather_conditions?: string;
  land_use?: string;
  depth_units?: UnitType;
  sedimentation_units?: UnitType;
}

export interface SedimentationMeasurement {
  sediment_size: number;
  sediment_roundness: number;
}

export interface SedimentationData {
  photo_url?: string | null;
  measurements: SedimentationMeasurement[];
}

export interface CreateSiteData {
  river_walk_id: string;
  site_number: number;
  site_name: string;
  river_width: number;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  notes?: string;
  weather_conditions?: string;
  land_use?: string;
  depth_units?: UnitType;
  sedimentation_units?: UnitType;
  sedimentation_photo_url?: string;
  sedimentation_data?: SedimentationData;
}

export interface UpdateSiteData {
  site_name: string;
  river_width: number;
  latitude?: number;
  longitude?: number;
  photo_url?: string | null;
  notes?: string;
  weather_conditions?: string;
  land_use?: string;
  depth_units?: UnitType;
  sedimentation_units?: UnitType;
  sedimentation_photo_url?: string | null;
  sedimentation_data?: SedimentationData | null;
}

// Photo-related types
export interface SitePhoto {
  id: string;
  site_id: string;
  photo_url: string;
  filename: string | null;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
}

export interface CreateMeasurementPointData {
  point_number: number;
  distance_from_bank: number;
  depth: number;
}

export interface MeasurementPointFormData {
  distance_from_bank: number;
  depth: number;
}
