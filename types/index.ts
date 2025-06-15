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
}

export interface Site {
  id: string;
  river_walk_id: string;
  site_number: number;
  site_name: string;
  river_width: number;
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
}

export interface SiteFormData {
  site_name: string;
  river_width: string;
}

export interface CreateSiteData {
  river_walk_id: string;
  site_number: number;
  site_name: string;
  river_width: number;
}

export interface UpdateSiteData {
  site_name: string;
  river_width: number;
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
