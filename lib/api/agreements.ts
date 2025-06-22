import { supabase } from '../supabase';
import type { UserAgreement, TermsAcceptanceData } from '../../types';

// Record user's acceptance of terms and privacy policy
export async function recordTermsAcceptance(
  userId: string,
  acceptanceData: TermsAcceptanceData,
  ipAddress?: string,
  userAgent?: string
): Promise<UserAgreement> {
  const { data, error } = await supabase
    .from('user_agreements')
    .insert({
      user_id: userId,
      terms_accepted_at: acceptanceData.terms_accepted ? new Date().toISOString() : null,
      privacy_accepted_at: acceptanceData.privacy_accepted ? new Date().toISOString() : null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording terms acceptance:', error);
    throw new Error(`Failed to record terms acceptance: ${error.message}`);
  }

  return data;
}

// Check if user has accepted current terms
export async function getUserAgreement(userId: string): Promise<UserAgreement | null> {
  const { data, error } = await supabase
    .from('user_agreements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // If no agreement found, that's ok - return null
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching user agreement:', error);
    throw new Error(`Failed to fetch user agreement: ${error.message}`);
  }

  return data;
}

// Update existing agreement (for new terms versions)
export async function updateTermsAcceptance(
  userId: string,
  acceptanceData: TermsAcceptanceData,
  ipAddress?: string,
  userAgent?: string
): Promise<UserAgreement> {
  // For simplicity, we'll just create a new record for updated terms
  // In production, you might want to track version history
  return recordTermsAcceptance(userId, acceptanceData, ipAddress, userAgent);
}

// Check if user needs to accept terms (helper function)
export async function userNeedsToAcceptTerms(userId: string): Promise<boolean> {
  const agreement = await getUserAgreement(userId);
  
  // If no agreement exists, they need to accept terms
  if (!agreement) {
    return true;
  }

  // Check if both terms and privacy were accepted
  const hasAcceptedTerms = agreement.terms_accepted_at !== null;
  const hasAcceptedPrivacy = agreement.privacy_accepted_at !== null;

  return !hasAcceptedTerms || !hasAcceptedPrivacy;
}

// Get client IP address (helper function for API routes)
export function getClientIP(req: any): string | undefined {
  // Check various headers for IP address
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }

  return remoteAddress;
}