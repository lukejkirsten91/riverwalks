// Database types
export interface RiverWalk {
  id: string;
  created_at: string;
  updated_at: string;
  date_created: string;
  name: string;
  date: string;
  country: string;
  county: string | null;
  user_id: string;
  archived: boolean;
  notes: string | null;
  access_type?: 'owned' | 'collaborated'; // Added for collaboration UI
  collaboration_role?: 'owner' | 'editor' | 'viewer'; // Added for role-based permissions
}

export type TodoStatus = 'not_started' | 'in_progress' | 'complete';

export interface VelocityMeasurement {
  measurement_number: number;
  time_seconds: number;
  float_travel_distance: number;
  velocity_ms: number;
}

export interface VelocityData {
  measurements: VelocityMeasurement[];
  average_velocity?: number;
  float_distance_units?: UnitType;
  time_units?: 'seconds' | 'minutes';
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
  velocity_measurement_count: number;
  velocity_data: VelocityData | null;
  todo_site_info_status: TodoStatus;
  todo_cross_section_status: TodoStatus;
  todo_velocity_status: TodoStatus;
  todo_sediment_status: TodoStatus;
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
  velocity_measurement_count?: number;
  velocity_data?: VelocityData;
  todo_site_info_status?: TodoStatus;
  todo_cross_section_status?: TodoStatus;
  todo_velocity_status?: TodoStatus;
  todo_sediment_status?: TodoStatus;
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
  velocity_measurement_count?: number;
  velocity_data?: VelocityData | null;
  todo_site_info_status?: TodoStatus;
  todo_cross_section_status?: TodoStatus;
  todo_velocity_status?: TodoStatus;
  todo_sediment_status?: TodoStatus;
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

// User agreement tracking for legal compliance
export interface UserAgreement {
  id: string;
  user_id: string;
  terms_accepted_at: string;
  privacy_accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Form data for terms acceptance
export interface TermsAcceptanceData {
  terms_accepted: boolean;
  privacy_accepted: boolean;
  marketing_consent?: boolean; // Optional for future use
}

// =====================================================
// SUBSCRIPTION SYSTEM TYPES
// =====================================================

export type PlanType = 'yearly' | 'lifetime';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'unpaid';
export type VoucherDiscountType = 'percentage' | 'fixed_amount';
export type PaymentEventType = 'payment_succeeded' | 'payment_failed' | 'subscription_created' | 'subscription_updated' | 'subscription_canceled' | 'refund_created';
export type GDPRRequestType = 'data_export' | 'data_deletion' | 'data_correction';
export type GDPRRequestStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_payment_intent_id?: string;
  plan_type: PlanType;
  plan_price_pence: number;
  status: SubscriptionStatus;
  subscription_start?: string;
  subscription_end?: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  voucher_code?: string;
  discount_applied_pence: number;
  payment_method?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  max_uses: number;
  uses_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  plan_types: PlanType[];
  new_users_only: boolean;
  created_by?: string;
  description?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherUsage {
  id: string;
  voucher_id: string;
  user_id: string;
  subscription_id?: string;
  discount_applied_pence: number;
  original_price_pence: number;
  final_price_pence: number;
  used_at: string;
  user_email: string;
  stripe_payment_intent_id?: string;
}

export interface PaymentEvent {
  id: string;
  user_id: string;
  subscription_id?: string;
  event_type: PaymentEventType;
  stripe_event_id?: string;
  amount_pence?: number;
  currency: string;
  payment_method?: string;
  stripe_data?: any;
  created_at: string;
}

export interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: GDPRRequestType;
  status: GDPRRequestStatus;
  requested_data?: any;
  export_url?: string;
  export_expires_at?: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateCheckoutSessionRequest {
  planType: PlanType;
  voucherCode?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  planType?: PlanType;
  status?: SubscriptionStatus;
  expiresAt?: string;
  isTrial: boolean;
  subscriptionDetails?: Subscription;
}

export interface ValidateVoucherRequest {
  voucherCode: string;
  planType: PlanType;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  discountType?: VoucherDiscountType;
  discountValue?: number;
  discountAmountPence?: number;
  originalPricePence?: number;
  finalPricePence?: number;
  savedAmount?: number;
  savedPercentage?: number;
  error?: string;
}

export interface CreateVoucherRequest {
  code: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
  planTypes?: PlanType[];
  newUsersOnly?: boolean;
  description?: string;
  internalNotes?: string;
}

export interface VoucherWithStats extends Voucher {
  usageStats: {
    totalUses: number;
    remainingUses: number;
    totalDiscountGiven: number;
    recentUsage: VoucherUsage[];
  };
}

export interface CancelSubscriptionRequest {
  immediate?: boolean;
}

export interface CancelSubscriptionResponse {
  message: string;
  canceledAt?: string;
  accessUntil?: string;
}

export interface DataExportResponse {
  message: string;
  requestId: string;
  data: any;
  exportedAt: string;
}

export interface DeleteAccountRequest {
  userId: string;
  confirmationCode: string;
}

export interface DeleteAccountResponse {
  message: string;
  deletedAt: string;
  requestId: string;
}

// =====================================================
// COMPONENT PROPS TYPES
// =====================================================

export interface SubscriptionCardProps {
  subscription?: Subscription;
  onUpgrade?: () => void;
  onCancel?: () => void;
  onManage?: () => void;
}

export interface VoucherInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: (voucher: ValidateVoucherResponse) => void;
  planType: PlanType;
  disabled?: boolean;
}

export interface PaymentSummaryProps {
  planType: PlanType;
  originalPrice: number;
  discount?: ValidateVoucherResponse;
  finalPrice: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PlanDetails {
  type: PlanType;
  name: string;
  price: number; // in pence
  description: string;
  features: string[];
}

export interface PricingTier {
  yearly: PlanDetails;
  lifetime: PlanDetails;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      vouchers: {
        Row: Voucher;
        Insert: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Voucher, 'id' | 'created_at' | 'updated_at'>>;
      };
      voucher_usage: {
        Row: VoucherUsage;
        Insert: Omit<VoucherUsage, 'id' | 'used_at'>;
        Update: Partial<Omit<VoucherUsage, 'id' | 'used_at'>>;
      };
      payment_events: {
        Row: PaymentEvent;
        Insert: Omit<PaymentEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<PaymentEvent, 'id' | 'created_at'>>;
      };
      gdpr_requests: {
        Row: GDPRRequest;
        Insert: Omit<GDPRRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GDPRRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Functions: {
      has_active_subscription: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      get_user_subscription_status: {
        Args: { user_uuid: string };
        Returns: {
          has_subscription: boolean;
          plan_type?: PlanType;
          status?: SubscriptionStatus;
          expires_at?: string;
          is_trial: boolean;
        };
      };
      validate_voucher: {
        Args: { 
          voucher_code_input: string;
          user_uuid: string;
          plan_type_input: PlanType;
        };
        Returns: {
          is_valid: boolean;
          discount_type?: VoucherDiscountType;
          discount_value?: number;
          final_discount_pence?: number;
          error_message?: string;
        };
      };
    };
  };
}
