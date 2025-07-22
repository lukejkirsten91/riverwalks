import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Users, CreditCard, Tag, Activity, AlertCircle, Crown, Plus, Edit, Trash2, BarChart3, Mail } from 'lucide-react';
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
      
      return matchesSearch && matchesSubscription;
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
      subscriptionType === 'free' ? (!user.subscription_type || user.subscription_type === 'free') :
      user.subscription_type === subscriptionType
    );
    
    const newSelected = new Set(selectedUsers);
    usersToSelect.forEach(user => newSelected.add(user.id));
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = filteredAndSortedUsers();
    const newSelected = new Set(selectedUsers);
    filtered.forEach(user => newSelected.add(user.id));
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
    return users.filter(user => selectedUsers.has(user.id)).map(user => ({
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
              { id: 'email', name: 'Email', icon: Mail }
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    All Free Users
                  </button>
                  <button
                    onClick={() => handleBulkSelect('annual')}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-lg text-sm"
                  >
                    All Annual Subscribers
                  </button>
                  <button
                    onClick={() => handleBulkSelect('lifetime')}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg text-sm"
                  >
                    All Lifetime Members
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg text-sm"
                  >
                    Select All Visible
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
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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

// Bulk Email Modal Component
function BulkEmailModal({ selectedUsers, onClose, onSuccess }: { 
  selectedUsers: Array<{email: string, name: string}>, 
  onClose: () => void,
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
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

      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          emails: selectedUsers.map(u => u.email),
          subject: formData.subject,
          body: formData.body
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send bulk email');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Send Bulk Email</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
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
            <p className="text-sm text-blue-700 mt-2">
              📧 Each recipient will receive the email individually via BCC (no shared addresses)
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            <div>
              <label htmlFor="bulk-body" className="block text-sm font-medium text-gray-700 mb-2">
                Message Body
              </label>
              <textarea
                id="bulk-body"
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

            <div className="flex justify-end space-x-3 pt-4">
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
