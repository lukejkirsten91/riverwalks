import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Users, CreditCard, Tag, Activity, AlertCircle, Crown, Plus, Edit, Trash2, BarChart3, Mail, MessageSquare } from 'lucide-react';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { isCurrentUserAdmin } from '../lib/client-auth';
import { logger } from '../lib/logger';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  conversionRate: number;
}

interface UserSubscription {
  id: string;
  email: string;
  subscription_type: string | null;
  status: string | null;
  created_at: string;
  current_period_end: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  marketing_consent?: boolean;
  marketing_consent_date?: string | null;
}

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  uses_count: number;
  valid_until: string | null;
  is_active: boolean;
  plan_types: string[];
  new_users_only: boolean;
  created_at: string;
}

interface PaymentEvent {
  id: string;
  event_type: string;
  user_email: string | null;
  processed_at: string;
  stripe_event_id: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    conversionRate: 0
  });
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [voucherUsage, setVoucherUsage] = useState<any[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = useState<number>(0);
  
  // User filtering and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubscription, setFilterSubscription] = useState('all');
  const [filterMarketingConsent, setFilterMarketingConsent] = useState('all');
  const [sortBy, setSortBy] = useState<'email' | 'created_at' | 'subscription_type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingNames, setEditingNames] = useState({ first_name: '', last_name: '', display_name: '' });

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      // Check if user has admin privileges
      const hasAdminAccess = await isCurrentUserAdmin();
      if (!hasAdminAccess) {
        logger.warn('Non-admin user attempted to access admin page', { 
          userId: session.user.id 
        });
        router.push('/river-walks');
        return;
      }

      setUser(session.user);
      await loadDashboardData();
      setLoading(false);
    };

    checkAdminAccess();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Load stats with proper auth
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setUsers(data.users);
      } else {
        // Fallback: Load what we can from client side
        const { data: subscriptionsData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('status', 'active');

        const activeSubscriptions = subscriptionsData?.length || 0;
        
        setStats({
          totalUsers: 0, // Will need API endpoint for this
          activeSubscriptions,
          totalRevenue: activeSubscriptions * 1.99,
          conversionRate: 0
        });

        // Load basic subscription data
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('user_id, subscription_type, status, created_at, current_period_end');

        const usersFromSubscriptions = subscriptions?.map(sub => ({
          id: sub.user_id,
          email: 'Loading...', // Will need API endpoint for emails
          subscription_type: sub.subscription_type,
          status: sub.status,
          created_at: sub.created_at,
          current_period_end: sub.current_period_end
        })) || [];

        setUsers(usersFromSubscriptions);
      }

      // Load vouchers
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      setVouchers(vouchersData || []);

      // Load recent payment events
      const { data: eventsData } = await supabase
        .from('payment_events')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(20);

      setPaymentEvents(eventsData || []);

      // Load voucher usage logs
      const { data: usageData } = await supabase
        .from('voucher_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(50);

      setVoucherUsage(usageData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const createVoucher = async (voucherData: any) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .insert([voucherData]);

      if (!error) {
        await loadDashboardData();
        setShowVoucherModal(false);
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
    }
  };

  const toggleVoucherStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (!error) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error updating voucher:', error);
    }
  };

  const updateVoucherUsage = async (id: string, currentUsage: number, change: number) => {
    try {
      const newUsage = Math.max(0, currentUsage + change);
      const { error } = await supabase
        .from('vouchers')
        .update({ uses_count: newUsage })
        .eq('id', id);

      if (!error) {
        await loadDashboardData();
      } else {
        console.error('Error updating voucher usage:', error);
      }
    } catch (error) {
      console.error('Error updating voucher usage:', error);
    }
  };

  const updateVoucherMaxUses = async (id: string, currentMaxUses: number, change: number) => {
    try {
      const newMaxUses = Math.max(1, currentMaxUses + change); // Minimum 1 use
      const { error } = await supabase
        .from('vouchers')
        .update({ max_uses: newMaxUses })
        .eq('id', id);

      if (!error) {
        await loadDashboardData();
      } else {
        console.error('Error updating voucher max uses:', error);
      }
    } catch (error) {
      console.error('Error updating voucher max uses:', error);
    }
  };

  const saveEditedMaxUses = async (id: string) => {
    try {
      const newMaxUses = Math.max(1, editMaxUses); // Minimum 1 use
      const { error } = await supabase
        .from('vouchers')
        .update({ max_uses: newMaxUses })
        .eq('id', id);

      if (!error) {
        setEditingVoucher(null);
        await loadDashboardData();
      } else {
        console.error('Error updating voucher max uses:', error);
      }
    } catch (error) {
      console.error('Error updating voucher max uses:', error);
    }
  };

  const startEditingMaxUses = (id: string, currentMaxUses: number) => {
    setEditingVoucher(id);
    setEditMaxUses(currentMaxUses);
  };

  const updateUserSubscription = async (userId: string, subscriptionType: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          subscriptionType
        })
      });

      if (response.ok) {
        await loadDashboardData(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Failed to update subscription:', error);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  // User filtering and selection helper functions
  const filteredAndSortedUsers = () => {
    let filtered = users.filter(user => {
      // Search filter - search by email, first name, last name, or display name
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.email.toLowerCase().includes(searchLower) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
        (user.display_name && user.display_name.toLowerCase().includes(searchLower)) ||
        getDisplayName(user).toLowerCase().includes(searchLower);
      
      // Subscription filter
      const matchesSubscription = filterSubscription === 'all' || 
        (filterSubscription === 'free' && (!user.subscription_type || user.subscription_type === 'free')) ||
        (filterSubscription === 'annual' && user.subscription_type === 'annual') ||
        (filterSubscription === 'lifetime' && user.subscription_type === 'lifetime');
      
      // Marketing consent filter
      const matchesMarketingConsent = filterMarketingConsent === 'all' ||
        (filterMarketingConsent === 'consented' && user.marketing_consent) ||
        (filterMarketingConsent === 'not-consented' && !user.marketing_consent);
      
      return matchesSearch && matchesSubscription && matchesMarketingConsent;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortBy === 'email') {
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
      } else if (sortBy === 'created_at') {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      } else {
        aValue = a.subscription_type || 'free';
        bValue = b.subscription_type || 'free';
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user?.marketing_consent) {
      // Don't allow selection of users without marketing consent
      return;
    }
    
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkSelect = (subscriptionType: string) => {
    const usersToSelect = users.filter(user => 
      user.marketing_consent && ( // Only include users with marketing consent
        subscriptionType === 'free' ? (!user.subscription_type || user.subscription_type === 'free') :
        user.subscription_type === subscriptionType
      )
    );
    
    const newSelected = new Set(selectedUsers);
    usersToSelect.forEach(user => newSelected.add(user.id));
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = filteredAndSortedUsers();
    const newSelected = new Set(selectedUsers);
    // Only select users with marketing consent
    filtered.filter(user => user.marketing_consent).forEach(user => newSelected.add(user.id));
    setSelectedUsers(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
  };

  const getSelectedUserEmails = () => {
    return users.filter(user => selectedUsers.has(user.id)).map(user => user.email);
  };

  const getDisplayName = (user: UserSubscription) => {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email.split('@')[0];
  };

  const getSelectedUsersWithNames = () => {
    return users.filter(user => selectedUsers.has(user.id) && user.marketing_consent).map(user => ({
      email: user.email,
      name: getDisplayName(user)
    }));
  };

  const startEditingName = (user: UserSubscription) => {
    setEditingUser(user.id);
    setEditingNames({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      display_name: user.display_name || ''
    });
  };

  const saveUserName = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/update-user-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          ...editingNames
        })
      });

      if (response.ok) {
        setEditingUser(null);
        await loadDashboardData(); // Refresh data
      } else {
        const error = await response.json();
        console.error('Failed to update user name:', error);
        alert('Failed to update user name: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating user name:', error);
      alert('Error updating user name: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3 sm:gap-4">
            <div className="flex items-center">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Riverwalks Admin</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Platform Administration Dashboard</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">Welcome, {user?.email}</span>
              <button
                onClick={() => router.push('/river-walks')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium w-full sm:w-auto"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Subscribers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Est. Revenue</p>
                <p className="text-2xl font-bold text-gray-900">£{stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <nav className="flex flex-wrap sm:space-x-8 px-4 sm:px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'vouchers', name: 'Vouchers', icon: Tag },
              { id: 'voucher-usage', name: 'Usage', icon: Activity },
              { id: 'events', name: 'Events', icon: CreditCard },
              { id: 'email', name: 'Email', icon: Mail },
              { id: 'email-templates', name: 'Templates', icon: Edit },
              { id: 'feedback', name: 'Feedback', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none justify-center sm:justify-start`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'analytics' && (
            <div>
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Analytics & Insights</h3>
                    <p className="text-sm text-gray-600">User behavior, conversion metrics, and platform performance</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/analytics/report', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              period: '7d', 
                              email: 'luke.kirsten@gmail.com',
                              type: 'manual'
                            })
                          });
                          const result = await response.json();
                          if (result.success) {
                            alert('📧 Weekly report sent to luke.kirsten@gmail.com!');
                          } else {
                            alert('❌ Report failed: ' + result.error);
                          }
                        } catch (error) {
                          alert('❌ Report error: ' + error);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Send Weekly Report
                    </button>
                  </div>
                </div>
              </div>
              <AnalyticsDashboard />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-medium text-gray-900">User Management & Bulk Email</h3>
                {selectedUsers.size > 0 && (
                  <button
                    onClick={() => setShowBulkEmail(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email {selectedUsers.size} Selected Users
                  </button>
                )}
              </div>

              {/* Search and Filter Controls */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
                    <input
                      type="text"
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Subscription Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Subscription</label>
                    <select
                      value={filterSubscription}
                      onChange={(e) => setFilterSubscription(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Users</option>
                      <option value="free">Free Users</option>
                      <option value="annual">Annual Subscribers</option>
                      <option value="lifetime">Lifetime Members</option>
                    </select>
                  </div>

                  {/* Marketing Consent Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marketing Consent</label>
                    <select
                      value={filterMarketingConsent}
                      onChange={(e) => setFilterMarketingConsent(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Users</option>
                      <option value="consented">✓ Consented Only</option>
                      <option value="not-consented">✗ Not Consented</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="created_at">Date Joined</option>
                      <option value="email">Email Address</option>
                      <option value="subscription_type">Subscription Type</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Selection Controls */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-gray-700">Quick Select:</span>
                  <button
                    onClick={() => handleBulkSelect('free')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Free Users (✓ Consented)
                  </button>
                  <button
                    onClick={() => handleBulkSelect('annual')}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Annual (✓ Consented)
                  </button>
                  <button
                    onClick={() => handleBulkSelect('lifetime')}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Lifetime (✓ Consented)
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Select All (✓ Consented)
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Clear Selection
                  </button>
                  {selectedUsers.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedUsers.size} users selected
                    </span>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={filteredAndSortedUsers().length > 0 && filteredAndSortedUsers().every(user => selectedUsers.has(user.id))}
                          onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketing</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedUsers().map((user) => (
                      <tr key={user.id} className={selectedUsers.has(user.id) ? 'bg-blue-50' : ''}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleUserSelect(user.id)}
                            disabled={!user.marketing_consent}
                            className={`h-4 w-4 focus:ring-blue-500 border-gray-300 rounded ${
                              user.marketing_consent 
                                ? 'text-blue-600' 
                                : 'text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                            title={user.marketing_consent ? 'User has consented to marketing emails' : 'User has not consented to marketing emails - cannot be selected'}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingUser === user.id ? (
                            <div className="space-y-1">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  placeholder="First"
                                  value={editingNames.first_name}
                                  onChange={(e) => setEditingNames({...editingNames, first_name: e.target.value})}
                                  className="w-20 px-1 py-1 text-xs border border-gray-300 rounded"
                                />
                                <input
                                  type="text"
                                  placeholder="Last"
                                  value={editingNames.last_name}
                                  onChange={(e) => setEditingNames({...editingNames, last_name: e.target.value})}
                                  className="w-20 px-1 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Display name (optional)"
                                value={editingNames.display_name}
                                onChange={(e) => setEditingNames({...editingNames, display_name: e.target.value})}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveUserName(user.id)}
                                  className="bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="bg-gray-600 text-white px-2 py-1 text-xs rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{getDisplayName(user)}</span>
                              <button
                                onClick={() => startEditingName(user)}
                                className="text-blue-600 hover:text-blue-800 text-xs opacity-50 hover:opacity-100"
                                title="Edit name"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 truncate max-w-[150px] sm:max-w-none">
                          {user.email}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.subscription_type === 'lifetime'
                              ? 'bg-amber-100 text-amber-800'
                              : user.subscription_type === 'annual'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.subscription_type || 'Free'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.marketing_consent
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.marketing_consent ? '✓ Yes' : '✗ No'}
                            </span>
                            {user.marketing_consent && (
                              <span className="text-xs text-gray-500" title={`Consented: ${user.marketing_consent_date ? new Date(user.marketing_consent_date).toLocaleDateString() : 'Unknown'}`}>
                                📧
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.status || 'Basic'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <select
                            value={user.subscription_type || 'free'}
                            onChange={(e) => updateUserSubscription(user.id, e.target.value === 'free' ? null : e.target.value)}
                            className="text-xs sm:text-sm border border-gray-300 rounded px-1 sm:px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-[80px] sm:max-w-none"
                          >
                            <option value="free">Free</option>
                            <option value="annual">Annual</option>
                            <option value="lifetime">Lifetime</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAndSortedUsers().length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No users found matching your criteria.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-medium text-gray-900">Voucher Management</h3>
                <button
                  onClick={() => setShowVoucherModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Create Voucher
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vouchers.map((voucher) => (
                      <tr key={voucher.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                          {voucher.code}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voucher.discount_type === 'percentage' ? `${voucher.discount_value}%` : `£${(voucher.discount_value / 100).toFixed(2)}`}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => updateVoucherMaxUses(voucher.id, voucher.max_uses, -1)}
                              disabled={voucher.max_uses <= 1}
                              className="w-5 h-5 sm:w-6 sm:h-6 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 text-red-600 rounded text-xs font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="min-w-[50px] sm:min-w-[60px] text-center font-mono text-xs sm:text-sm">
                              {voucher.uses_count} / 
                              {editingVoucher === voucher.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editMaxUses}
                                  onChange={(e) => setEditMaxUses(parseInt(e.target.value) || 1)}
                                  className="w-12 text-center border border-gray-300 rounded px-1 mx-1"
                                  onBlur={() => saveEditedMaxUses(voucher.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditedMaxUses(voucher.id);
                                    if (e.key === 'Escape') setEditingVoucher(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                                  onClick={() => startEditingMaxUses(voucher.id, voucher.max_uses)}
                                >
                                  {voucher.max_uses}
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => updateVoucherMaxUses(voucher.id, voucher.max_uses, 1)}
                              className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 text-green-600 rounded text-xs font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                            <button
                              onClick={() => startEditingMaxUses(voucher.id, voucher.max_uses)}
                              className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold flex items-center justify-center ml-1"
                              title="Edit max uses"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            voucher.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {voucher.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleVoucherStatus(voucher.id, voucher.is_active)}
                            className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                          >
                            {voucher.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'voucher-usage' && (
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voucher Usage Tracking</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {voucherUsage.map((usage) => (
                      <tr key={usage.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                          {usage.voucher_code}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[120px] sm:max-w-none">
                          {usage.user_email}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            usage.plan_type === 'lifetime'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {usage.plan_type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usage.discount_type === 'percentage' ? `${usage.discount_value}%` : `£${(usage.discount_value / 100).toFixed(2)}`}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(usage.used_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {voucherUsage.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No voucher usage data found
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Payment Events</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe Event ID</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {event.event_type}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[120px] sm:max-w-none">
                          {event.user_email || 'Unknown'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {event.stripe_event_id}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.processed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <EmailForm />
          )}

          {activeTab === 'email-templates' && (
            <EmailTemplatesManager />
          )}

          {activeTab === 'feedback' && (
            <FeedbackManager />
          )}

          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Overview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent User Activity</h4>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900">{user.email}</span>
                        <span className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Active Vouchers</h4>
                  <div className="space-y-3">
                    {vouchers.filter(v => v.is_active).slice(0, 5).map((voucher) => (
                      <div key={voucher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900 font-mono">{voucher.code}</span>
                        <span className="text-xs text-gray-500">{voucher.uses_count}/{voucher.max_uses} used</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voucher Creation Modal */}
      {showVoucherModal && <VoucherCreationModal onClose={() => setShowVoucherModal(false)} onCreate={createVoucher} />}
      
      {/* Bulk Email Modal */}
      {showBulkEmail && (
        <BulkEmailModal 
          selectedUsers={getSelectedUsersWithNames()} 
          onClose={() => setShowBulkEmail(false)}
          onSuccess={() => {
            setShowBulkEmail(false);
            setSelectedUsers(new Set());
          }}
        />
      )}
    </div>
  );
}

// Email Form Component
function EmailForm() {
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setMessage({ type: 'success', text: 'Email sent successfully!' });
      setFormData({ to: '', subject: '', body: '' });
    } catch (error) {
      console.error('Email send error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send email' 
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Send Email</h3>
        <p className="text-sm text-gray-600 mb-6">Send a custom email to any email address.</p>
        
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email-to" className="block text-sm font-medium text-gray-700 mb-2">
              To Email Address
            </label>
            <input
              id="email-to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Email subject..."
              required
            />
          </div>

          <div>
            <label htmlFor="email-body" className="block text-sm font-medium text-gray-700 mb-2">
              Message Body
            </label>
            <textarea
              id="email-body"
              rows={12}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Enter your message here..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The message will be formatted with line breaks preserved and styled in a professional template.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setFormData({ to: '', subject: '', body: '' });
                setMessage(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sending && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Email Templates Manager Component
function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/email-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingTemplate({
      name: '',
      type: 'welcome',
      subject: '',
      content: '',
      variables: ['name', 'email'],
      is_active: true
    });
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email templates...</p>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={() => {
          loadTemplates();
          setShowEditor(false);
          setEditingTemplate(null);
        }}
        onCancel={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Email Templates</h3>
          <p className="text-sm text-gray-600">Manage customizable email templates for automated messages</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="grid gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    template.type === 'welcome' ? 'bg-green-100 text-green-800' :
                    template.type === 'feedback_request' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {template.type}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
              <p className="text-sm text-gray-600">{template.subject}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Variables:</p>
              <div className="flex flex-wrap gap-1">
                {(template.variables || []).map((variable: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Created: {new Date(template.created_at).toLocaleDateString()}
              {template.updated_at !== template.created_at && 
                ` • Updated: ${new Date(template.updated_at).toLocaleDateString()}`
              }
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No email templates found</p>
            <button
              onClick={handleNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create Your First Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Email Template Editor Component
function EmailTemplateEditor({ template, onSave, onCancel }: {
  template: any,
  onSave: () => void,
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'welcome',
    subject: template?.subject || '',
    content: template?.content || '',
    variables: template?.variables || ['name', 'email'],
    is_active: template?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = template?.id ? '/api/admin/email-templates' : '/api/admin/email-templates';
      const method = template?.id ? 'PUT' : 'POST';
      const body = template?.id 
        ? { id: template.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert('Failed to save template: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // For welcome emails, we can test using the welcome email API
      if (formData.type === 'welcome') {
        const response = await fetch('/api/admin/send-welcome-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: 'test',
            userEmail: testEmail,
            userName: 'Test User',
            templateId: template?.id,
            manual: true
          }),
        });

        if (response.ok) {
          alert('Test email sent successfully!');
        } else {
          const error = await response.json();
          alert('Failed to send test email: ' + error.error);
        }
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email');
    } finally {
      setSending(false);
    }
  };

  const replaceVariables = (text: string) => {
    let result = text;
    const sampleVars = {
      name: 'John Doe',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      site_url: 'https://riverwalks.co.uk'
    };
    
    Object.keys(sampleVars).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, sampleVars[key as keyof typeof sampleVars]);
    });
    
    return result;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {template?.id ? 'Edit Email Template' : 'New Email Template'}
          </h3>
          <p className="text-sm text-gray-600">Create and customize email templates with variables</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
          >
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.subject || !formData.content}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h4>
          <div className="mb-4">
            <strong>Subject:</strong> {replaceVariables(formData.subject)}
          </div>
          <div 
            className="border border-gray-200 rounded p-4 bg-gray-50"
            dangerouslySetInnerHTML={{ __html: replaceVariables(formData.content) }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Welcome Email Template"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="welcome">Welcome Email</option>
                <option value="feedback_request">Feedback Request</option>
                <option value="newsletter">Newsletter</option>
                <option value="notification">Notification</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Welcome to Riverwalks, {'{name}'}!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Content (HTML)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={20}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="Enter your HTML email content here..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use variables like name, email, first_name, last_name in your content
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Template is active</span>
            </label>
          </div>

          {formData.type === 'welcome' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Test Email</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={handleTestSend}
                  disabled={sending || !testEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Enhanced Bulk Email Modal Component with Template Support
function BulkEmailModal({ selectedUsers, onClose, onSuccess }: { 
  selectedUsers: Array<{email: string, name: string}>, 
  onClose: () => void,
  onSuccess: () => void
}) {
  const [emailMode, setEmailMode] = useState<'custom' | 'template'>('custom');
  const [templates, setTemplates] = useState<any[]>([]);
  const [feedbackForms, setFeedbackForms] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTemplatesAndForms();
  }, []);

  const loadTemplatesAndForms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const authHeader = { 'Authorization': `Bearer ${session.access_token}` };

      // Load email templates
      const templatesResponse = await fetch('/api/admin/email-templates', {
        headers: authHeader
      });
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        const activeTemplates = (templatesData.templates || []).filter((t: any) => 
          t.is_active && (t.type === 'newsletter' || t.type === 'announcement' || t.type === 'feedback_request')
        );
        setTemplates(activeTemplates);
      }

      // Load feedback forms
      const formsResponse = await fetch('/api/admin/feedback-forms', {
        headers: authHeader
      });
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        const activeForms = (formsData.forms || []).filter((f: any) => f.is_active);
        setFeedbackForms(activeForms);
      }
    } catch (error) {
      console.error('Error loading templates and forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      subject: template.subject || '',
      body: template.content || ''
    });
  };

  const insertFormLink = (form: any) => {
    const formUrl = `${window.location.origin}/feedback/${form.id}`;
    const linkText = `<a href="${formUrl}" style="color: #3b82f6; text-decoration: underline;">this form</a>`;
    const insertText = `We'd love to hear your feedback! Please take a moment to fill out ${linkText}.`;
    
    setFormData(prev => ({
      ...prev,
      body: prev.body + '\n\n' + insertText
    }));
  };

  const replaceVariables = (text: string, userName: string) => {
    return text
      .replace(/{{name}}/g, userName)
      .replace(/{{content}}/g, formData.body || 'Your custom message here...');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      let finalSubject = formData.subject;
      let finalBody = formData.body;

      // If using template, process variable replacement
      if (emailMode === 'template' && selectedTemplate) {
        // For template mode, we'll send individual emails to properly replace variables
        const sendPromises = selectedUsers.map(async (user) => {
          const personalizedSubject = replaceVariables(selectedTemplate.subject, user.name);
          const personalizedBody = replaceVariables(selectedTemplate.content, user.name);
          
          return fetch('/api/admin/send-bulk-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              emails: [user.email],
              subject: personalizedSubject,
              body: personalizedBody,
              templateId: selectedTemplate.id
            }),
          });
        });

        const results = await Promise.all(sendPromises);
        const failedCount = results.filter(r => !r.ok).length;
        
        if (failedCount > 0) {
          throw new Error(`Failed to send ${failedCount} out of ${selectedUsers.length} emails`);
        }
      } else {
        // Custom email mode - send as bulk
        const response = await fetch('/api/admin/send-bulk-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            emails: selectedUsers.map(u => u.email),
            subject: finalSubject,
            body: finalBody
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to send bulk email');
        }
      }

      setMessage({ type: 'success', text: `Email sent successfully to ${selectedUsers.length} recipients!` });
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      console.error('Bulk email send error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send bulk email' 
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg font-medium text-gray-900">Send Email to Users</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 self-end sm:self-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Recipients ({selectedUsers.length})</h4>
            <div className="max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map((user, index) => (
                  <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded" title={user.email}>
                    {user.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Email Mode Selection */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={() => setEmailMode('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  emailMode === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Email
              </button>
              <button
                onClick={() => setEmailMode('template')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  emailMode === 'template'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Use Template
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {emailMode === 'template' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Template
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{template.type}</div>
                      </div>
                    ))}
                    {templates.length === 0 && (
                      <p className="text-gray-500 text-sm">No email templates available</p>
                    )}
                  </div>
                </div>

                {/* Form Link Insertion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add Feedback Form Link
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {feedbackForms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{form.name}</div>
                          <div className="text-xs text-gray-500">{form.questions?.length || 0} questions</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => insertFormLink(form)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Insert Link
                        </button>
                      </div>
                    ))}
                    {feedbackForms.length === 0 && (
                      <p className="text-gray-500 text-sm">No feedback forms available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="bulk-subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                id="bulk-subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email subject..."
                required
              />
              {emailMode === 'template' && (
                <p className="text-xs text-gray-500 mt-1">Variables like {'{name}'} will be replaced automatically</p>
              )}
            </div>

            <div>
              <label htmlFor="bulk-body" className="block text-sm font-medium text-gray-700 mb-2">
                Message {emailMode === 'template' ? 'Content' : 'Body'}
              </label>
              <textarea
                id="bulk-body"
                rows={emailMode === 'template' ? 16 : 12}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical font-mono text-sm"
                placeholder={emailMode === 'template' ? 'Template content with HTML...' : 'Enter your message here...'}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                {emailMode === 'template' 
                  ? <>HTML content will be processed. Use {'{name}'}, {'{email}'}, {'{content}'} variables.</>
                  : 'The message will be formatted with line breaks preserved and styled in a professional template.'
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || selectedUsers.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {sending ? 'Sending...' : `Send to ${selectedUsers.length} Recipients`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Voucher Creation Modal Component
function VoucherCreationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: 10,
    plan_types: ['annual', 'lifetime'],
    new_users_only: false,
    valid_until: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...formData,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Voucher</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., STUDENT20"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.discount_type === 'percentage' ? 'Percentage' : 'Amount (pence)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min="1"
                max={formData.discount_type === 'percentage' ? '100' : '1000'}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
            <input
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Optional)</label>
            <input
              type="datetime-local"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="new_users_only"
              checked={formData.new_users_only}
              onChange={(e) => setFormData({ ...formData, new_users_only: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="new_users_only" className="ml-2 block text-sm text-gray-700">
              New users only
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Feedback Manager Component
function FeedbackManager() {
  const [forms, setForms] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState('forms');
  const [loading, setLoading] = useState(false);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  useEffect(() => {
    loadFeedbackData();
  }, [activeSubTab]);

  const loadFeedbackData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const authHeader = { 'Authorization': `Bearer ${session.access_token}` };

      if (activeSubTab === 'forms' || activeSubTab === 'overview') {
        // Load forms
        const formsResponse = await fetch('/api/admin/feedback-forms?include_questions=true', {
          headers: authHeader
        });
        if (formsResponse.ok) {
          const formsData = await formsResponse.json();
          setForms(formsData.forms || []);
        }
      }

      if (activeSubTab === 'campaigns' || activeSubTab === 'overview') {
        // Load campaigns
        const campaignsResponse = await fetch('/api/admin/feedback-campaigns', {
          headers: authHeader
        });
        if (campaignsResponse.ok) {
          const campaignsData = await campaignsResponse.json();
          setCampaigns(campaignsData.campaigns || []);
        }
      }

      if (activeSubTab === 'analytics' || activeSubTab === 'overview') {
        // Load analytics
        const analyticsResponse = await fetch('/api/admin/feedback-responses?analytics=true', {
          headers: authHeader
        });
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData.analytics);
        }

        // Load responses
        const responsesResponse = await fetch('/api/admin/feedback-responses', {
          headers: authHeader
        });
        if (responsesResponse.ok) {
          const responsesData = await responsesResponse.json();
          setResponses(responsesData.responses || []);
        }
      }
    } catch (error) {
      console.error('Error loading feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeFeedbackSystem = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/initialize-feedback-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Feedback system initialized:', result);
        
        // Reload data to show the new templates and forms
        loadFeedbackData();
        
        // Show success message
        alert('Feedback system initialized successfully! Default templates and forms have been created.');
      } else {
        const error = await response.json();
        console.error('Initialization failed:', error);
        alert('Failed to initialize feedback system. Check console for details.');
      }
    } catch (error) {
      console.error('Error initializing feedback system:', error);
      alert('Error initializing feedback system. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (formData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/feedback-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        loadFeedbackData();
        setShowFormEditor(false);
        setEditingForm(null);
      }
    } catch (error) {
      console.error('Error creating form:', error);
    }
  };

  const updateForm = async (formData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/feedback-forms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        loadFeedbackData();
        setShowFormEditor(false);
        setEditingForm(null);
      }
    } catch (error) {
      console.error('Error updating form:', error);
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/feedback-forms?id=${formId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        loadFeedbackData();
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const subTabs = [
    { id: 'forms', name: 'Forms', count: forms.length },
    { id: 'campaigns', name: 'Campaigns', count: campaigns.length },
    { id: 'analytics', name: 'Analytics', count: responses.length },
    { id: 'overview', name: 'Overview', count: null }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Feedback Management</h3>
        <div className="flex gap-3">
          <button
            onClick={initializeFeedbackSystem}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            disabled={loading}
          >
            <Activity className="w-4 h-4" />
            Initialize System
          </button>
          <button
            onClick={() => setShowFormEditor(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Form
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`${
                activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              {tab.name}
              {tab.count !== null && (
                <span className={`${
                  activeSubTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                } rounded-full px-2 py-1 text-xs font-medium`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Total Forms</p>
                      <p className="text-2xl font-bold text-blue-600">{forms.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Campaigns</p>
                      <p className="text-2xl font-bold text-green-600">{campaigns.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">Responses</p>
                      <p className="text-2xl font-bold text-purple-600">{responses.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Crown className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-900">NPS Score</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {analytics?.npsScore !== null ? analytics.npsScore : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Forms</h4>
                  <div className="space-y-2">
                    {forms.slice(0, 5).map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{form.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          form.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Responses</h4>
                  <div className="space-y-2">
                    {responses.slice(0, 5).map((response) => (
                      <div key={response.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{response.user_name || response.user_email}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(response.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forms Tab */}
          {activeSubTab === 'forms' && (
            <div className="space-y-4">
              {forms.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No feedback forms yet. Create your first form to get started!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {forms.map((form) => (
                    <div key={form.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{form.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              form.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {form.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {form.questions?.length || 0} questions
                            </span>
                            <span className="text-xs text-gray-500">
                              Created {new Date(form.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingForm(form);
                              setShowFormEditor(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteForm(form.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedForm(form);
                              setShowCampaignCreator(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeSubTab === 'analytics' && (
            <div className="space-y-6">
              {analytics && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Net Promoter Score</h4>
                      <p className="text-3xl font-bold text-blue-600">
                        {analytics.npsScore !== null ? analytics.npsScore : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {analytics.npsResponses?.length || 0} responses
                      </p>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Satisfaction</h4>
                      <p className="text-3xl font-bold text-green-600">
                        {analytics.satisfactionMetrics?.average ? 
                          `${analytics.satisfactionMetrics.average}/5` : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {analytics.satisfactionMetrics?.satisfied || 0} satisfied users
                      </p>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Total Responses</h4>
                      <p className="text-3xl font-bold text-purple-600">{analytics.totalResponses}</p>
                      <p className="text-sm text-gray-500 mt-1">Across all forms</p>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Question Analytics</h4>
                    <div className="space-y-4">
                      {Object.values(analytics.questionAnalytics || {}).map((q: any) => (
                        <div key={q.question} className="border-b pb-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">{q.question}</h5>
                          <div className="flex items-center gap-4">
                            {q.average && (
                              <span className="text-sm text-gray-600">
                                Average: <span className="font-medium">{q.average.toFixed(1)}</span>
                              </span>
                            )}
                            <span className="text-sm text-gray-600">
                              Responses: <span className="font-medium">{q.totalResponses}</span>
                            </span>
                          </div>
                          {Object.keys(q.distribution || {}).length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(q.distribution).map(([option, count]: [string, any]) => (
                                  <span key={option} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {option}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Campaigns Tab */}
          {activeSubTab === 'campaigns' && (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No campaigns yet. Send a form to users to create your first campaign!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              Form: {campaign.feedback_forms?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              Sent to: {campaign.sent_count} users
                            </span>
                            <span className="text-xs text-gray-500">
                              Responses: {campaign.response_count}
                            </span>
                            <span className="text-xs text-gray-500">
                              Response Rate: {campaign.sent_count > 0 ? 
                                Math.round((campaign.response_count / campaign.sent_count) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showFormEditor && (
        <FeedbackFormEditor
          form={editingForm}
          onSave={editingForm ? updateForm : createForm}
          onClose={() => {
            setShowFormEditor(false);
            setEditingForm(null);
          }}
        />
      )}

      {showCampaignCreator && selectedForm && (
        <FeedbackCampaignCreator
          form={selectedForm}
          onClose={() => {
            setShowCampaignCreator(false);
            setSelectedForm(null);
          }}
          onSuccess={() => {
            loadFeedbackData();
            setShowCampaignCreator(false);
            setSelectedForm(null);
          }}
        />
      )}
    </div>
  );
}

// Feedback Form Editor Component
function FeedbackFormEditor({ form, onSave, onClose }: { 
  form: any, 
  onSave: (data: any) => void, 
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    name: form?.name || '',
    description: form?.description || '',
    is_active: form?.is_active !== false,
    questions: form?.questions || []
  });
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      question_text: '',
      question_type: 'rating',
      options: { scale: 5, labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] },
      required: true,
      order_index: formData.questions.length + 1
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const updateQuestion = (index: number, updates: any) => {
    const updatedQuestions = formData.questions.map((q: any, i: number) => 
      i === index ? { ...q, ...updates } : q
    );
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_: any, i: number) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const submitData = {
      ...formData,
      id: form?.id
    };
    
    await onSave(submitData);
    setSaving(false);
  };

  const questionTypes = [
    { value: 'rating', label: 'Rating Scale' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'text', label: 'Text Response' },
    { value: 'yes_no', label: 'Yes/No' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {form ? 'Edit Feedback Form' : 'Create New Feedback Form'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Form Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., User Experience Survey"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                  Active (can be sent to users)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this feedback form..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Questions</h4>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {formData.questions.map((question: any, index: number) => (
                  <div key={question.id || index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-medium text-gray-900">Question {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Question Text</label>
                        <input
                          type="text"
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="Enter your question..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Question Type</label>
                        <select
                          value={question.question_type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            let newOptions = {};
                            
                            if (newType === 'rating') {
                              newOptions = { scale: 5, labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] };
                            } else if (newType === 'multiple_choice') {
                              newOptions = { options: ['Option 1', 'Option 2', 'Option 3'] };
                            } else if (newType === 'text') {
                              newOptions = { placeholder: 'Enter your response...' };
                            }
                            
                            updateQuestion(index, { 
                              question_type: newType,
                              options: newOptions
                            });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          {questionTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {question.question_type === 'rating' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Rating Scale</label>
                          <select
                            value={question.options?.scale || 5}
                            onChange={(e) => updateQuestion(index, {
                              options: { 
                                ...question.options, 
                                scale: parseInt(e.target.value),
                                nps: parseInt(e.target.value) === 10
                              }
                            })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          >
                            <option value={5}>1-5 Scale</option>
                            <option value={10}>1-10 Scale (NPS)</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`nps-${index}`}
                            checked={question.options?.nps || false}
                            onChange={(e) => updateQuestion(index, {
                              options: { ...question.options, nps: e.target.checked }
                            })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`nps-${index}`} className="ml-2 text-xs text-gray-700">
                            Use for NPS calculation
                          </label>
                        </div>
                      </div>
                    )}

                    {question.question_type === 'multiple_choice' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Options (one per line)</label>
                        <textarea
                          value={(question.options?.options || []).join('\n')}
                          onChange={(e) => updateQuestion(index, {
                            options: { 
                              ...question.options, 
                              options: e.target.value.split('\n').filter(o => o.trim()) 
                            }
                          })}
                          rows={3}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}

                    <div className="flex items-center mt-3">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={question.required !== false}
                        onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor={`required-${index}`} className="ml-2 text-xs text-gray-700">
                        Required question
                      </label>
                    </div>
                  </div>
                ))}

                {formData.questions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No questions yet. Click "Add Question" to get started!
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || formData.questions.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (form ? 'Update Form' : 'Create Form')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Feedback Campaign Creator Component
function FeedbackCampaignCreator({ form, onClose, onSuccess }: { 
  form: any, 
  onClose: () => void,
  onSuccess: () => void 
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [campaignData, setCampaignData] = useState({
    name: `${form.name} - ${new Date().toLocaleDateString()}`,
    description: `Survey campaign for ${form.name}`
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/feedback-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          form_id: form.id,
          name: campaignData.name,
          description: campaignData.description,
          user_ids: selectedUsers
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    const eligibleUsers = users.filter(u => u.marketing_consent);
    setSelectedUsers(eligibleUsers.map(u => u.id));
  };

  const selectNone = () => {
    setSelectedUsers([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Send Feedback Form</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{form.name}</h4>
            <p className="text-blue-800">{form.description}</p>
            <p className="text-sm text-blue-600 mt-1">{form.questions?.length || 0} questions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={campaignData.description}
                onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Select Users</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Select All Eligible
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Select None
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <div className="p-4 bg-gray-50 border-b text-sm text-gray-600">
                    {selectedUsers.length} of {users.filter(u => u.marketing_consent).length} eligible users selected
                  </div>
                  
                  <div className="divide-y">
                    {users.map((user) => (
                      <div key={user.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                            disabled={!user.marketing_consent}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.display_name || user.first_name || user.email}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.marketing_consent ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Marketing OK
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              No Marketing Consent
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || selectedUsers.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : `Send to ${selectedUsers.length} Users`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
