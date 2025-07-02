import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types';

// Admin email - only this user can manage vouchers
const ADMIN_EMAIL = 'lukekirsten91@gmail.com';

async function isAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabase = createServerSupabaseClient<Database>({ req, res });
    
    if (!(await isAdmin(supabase))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: { user } } = await supabase.auth.getUser();

    switch (req.method) {
      case 'GET':
        return await handleGetVouchers(supabase, res);
      
      case 'POST':
        return await handleCreateVoucher(supabase, req, res, user!.id);
      
      case 'PUT':
        return await handleUpdateVoucher(supabase, req, res);
      
      case 'DELETE':
        return await handleDeleteVoucher(supabase, req, res);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in admin vouchers endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetVouchers(supabase: any, res: NextApiResponse) {
  const { data: vouchers, error } = await supabase
    .from('vouchers')
    .select(`
      *,
      voucher_usage (
        id,
        user_email,
        used_at,
        discount_applied_pence,
        final_price_pence
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vouchers:', error);
    return res.status(500).json({ error: 'Failed to fetch vouchers' });
  }

  // Calculate usage statistics
  const vouchersWithStats = vouchers.map((voucher: any) => ({
    ...voucher,
    usageStats: {
      totalUses: voucher.voucher_usage?.length || 0,
      remainingUses: Math.max(0, voucher.max_uses - (voucher.voucher_usage?.length || 0)),
      totalDiscountGiven: voucher.voucher_usage?.reduce((sum: number, usage: any) => 
        sum + usage.discount_applied_pence, 0) || 0,
      recentUsage: voucher.voucher_usage?.slice(0, 5) || [], // Last 5 uses
    },
  }));

  res.status(200).json({ vouchers: vouchersWithStats });
}

async function handleCreateVoucher(supabase: any, req: NextApiRequest, res: NextApiResponse, adminId: string) {
  const {
    code,
    discountType,
    discountValue,
    maxUses = 1,
    validFrom,
    validUntil,
    planTypes = ['yearly', 'lifetime'],
    newUsersOnly = false,
    description,
    internalNotes,
  } = req.body;

  // Validation
  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ error: 'Code, discount type, and discount value are required' });
  }

  if (!['percentage', 'fixed_amount'].includes(discountType)) {
    return res.status(400).json({ error: 'Discount type must be percentage or fixed_amount' });
  }

  if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
    return res.status(400).json({ error: 'Percentage discount must be between 0 and 100' });
  }

  if (discountType === 'fixed_amount' && discountValue < 0) {
    return res.status(400).json({ error: 'Fixed amount discount must be positive' });
  }

  // Check if code already exists
  const { data: existingVoucher } = await supabase
    .from('vouchers')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();

  if (existingVoucher) {
    return res.status(400).json({ error: 'Voucher code already exists' });
  }

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert({
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses,
      valid_from: validFrom || new Date().toISOString(),
      valid_until: validUntil || null,
      plan_types: planTypes,
      new_users_only: newUsersOnly,
      description: description || null,
      internal_notes: internalNotes || null,
      created_by: adminId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating voucher:', error);
    return res.status(500).json({ error: 'Failed to create voucher' });
  }

  res.status(201).json({ voucher });
}

async function handleUpdateVoucher(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Voucher ID is required' });
  }

  // Only allow certain fields to be updated
  const allowedUpdates = {
    max_uses: updates.maxUses,
    valid_until: updates.validUntil,
    is_active: updates.isActive,
    description: updates.description,
    internal_notes: updates.internalNotes,
  };

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid updates provided' });
  }

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating voucher:', error);
    return res.status(500).json({ error: 'Failed to update voucher' });
  }

  res.status(200).json({ voucher });
}

async function handleDeleteVoucher(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Voucher ID is required' });
  }

  // Check if voucher has been used
  const { data: usage } = await supabase
    .from('voucher_usage')
    .select('id')
    .eq('voucher_id', id)
    .limit(1);

  if (usage && usage.length > 0) {
    // Don't actually delete if used, just deactivate
    const { error } = await supabase
      .from('vouchers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating voucher:', error);
      return res.status(500).json({ error: 'Failed to deactivate voucher' });
    }

    res.status(200).json({ message: 'Voucher deactivated (had usage history)' });
  } else {
    // Actually delete if never used
    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting voucher:', error);
      return res.status(500).json({ error: 'Failed to delete voucher' });
    }

    res.status(200).json({ message: 'Voucher deleted' });
  }
}