import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User, Trash2, AlertTriangle, Mail, Calendar, Crown, Shield, Download, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionBadge } from '../components/ui/SubscriptionBadge';
import { offlineDataService } from '../lib/offlineDataService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function AccountPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const subscription = useSubscription();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountStats, setAccountStats] = useState({
    riverWalks: 0,
    totalSites: 0,
    collaboratedWalks: 0,
    memberSince: '',
  });
  const [emailPreferences, setEmailPreferences] = useState({
    marketing: false,
    loading: false,
  });

  useEffect(() => {
    checkUser();
    loadAccountStats();
    loadEmailPreferences();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }
    setUser(session.user);
    setLoading(false);
  };

  const loadAccountStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get river walks count
      const { data: riverWalks } = await supabase
        .from('river_walks')
        .select('id')
        .eq('user_id', user.id);

      // Get total sites count
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .in('river_walk_id', riverWalks?.map(rw => rw.id) || []);

      // Get collaborated walks count (where user is collaborator but not owner)
      let collaboratedCount = 0;
      try {
        const { data: collaborations } = await supabase
          .from('collaborator_access')
          .select('id')
          .eq('user_email', user.email)
          .not('accepted_at', 'is', null);
        collaboratedCount = collaborations?.length || 0;
      } catch (error) {
        // Collaboration features might not be available for all users
        console.log('Collaboration data not available');
      }

      setAccountStats({
        riverWalks: riverWalks?.length || 0,
        totalSites: sites?.length || 0,
        collaboratedWalks: collaboratedCount,
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '',
      });
    } catch (error) {
      console.error('Error loading account stats:', error);
    }
  };

  const loadEmailPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('marketing_consent')
        .eq('user_id', user.id)
        .single();

      setEmailPreferences({
        marketing: agreement?.marketing_consent || false,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };

  const updateEmailPreference = async (type: 'marketing', value: boolean) => {
    setEmailPreferences(prev => ({ ...prev, loading: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First check if user_agreements record exists
      const { data: existingAgreement } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      if (existingAgreement) {
        // Update existing record
        const updateResult = await supabase
          .from('user_agreements')
          .update({ marketing_consent: value })
          .eq('user_id', user.id);
        error = updateResult.error;
      } else {
        // Create new record with basic terms acceptance
        const insertResult = await supabase
          .from('user_agreements')
          .insert({
            user_id: user.id,
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
            marketing_consent: value,
          });
        error = insertResult.error;
      }

      if (error) throw error;

      setEmailPreferences({
        marketing: value,
        loading: false,
      });

      showSuccess(
        'Preferences Updated', 
        value 
          ? 'You will receive educational updates and GCSE Geography tips'
          : 'You have been unsubscribed from educational updates'
      );
    } catch (error) {
      console.error('Error updating email preferences:', error);
      showError('Update Failed', 'Failed to update email preferences. Please try again.');
      setEmailPreferences(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE MY ACCOUNT') {
      showError('Confirmation Failed', 'Please type "DELETE MY ACCOUNT" exactly as shown');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Call our delete account API endpoint
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to delete account');
      }

      showSuccess('Account Deleted', 'Your account, email address, and all data have been permanently deleted');
      
      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      showError('Deletion Failed', 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    // Clear all offline data before signing out to prevent stale data
    await offlineDataService.clearAllOfflineData();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleExportData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/export-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riverwalks-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Data Exported', 'Your data has been downloaded as a JSON file');
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Export Failed', 'Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-muted flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading Account</h1>
          <p className="text-muted-foreground">Preparing your account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-muted">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl gradient-primary flex items-center justify-center">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Account Settings</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Manage your account and privacy settings</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="order-2 sm:order-1">
                <SubscriptionBadge subscription={subscription} userEmail={user?.email} />
              </div>
              <button
                onClick={() => router.push('/river-walks')}
                className="btn-secondary order-1 sm:order-2"
              >
                Back to River Walks
              </button>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            Account Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email Address</label>
                <p className="text-sm sm:text-base text-foreground font-medium break-all">{user?.email}</p>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Member Since</label>
                <p className="text-sm sm:text-base text-foreground font-medium">{accountStats.memberSince}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Authentication Provider</label>
                <p className="text-sm sm:text-base text-foreground font-medium capitalize">
                  {user?.app_metadata?.provider || 'Google'}
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">River Walks Created</label>
                <p className="text-sm sm:text-base text-foreground font-medium">{accountStats.riverWalks}</p>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sites Documented</label>
                <p className="text-sm sm:text-base text-foreground font-medium">{accountStats.totalSites}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Collaborated Projects</label>
                <p className="text-sm sm:text-base text-foreground font-medium">{accountStats.collaboratedWalks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Preferences */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            Email Preferences
          </h2>
          
          <div className="space-y-4">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3 transition-all duration-200 ${
              emailPreferences.marketing 
                ? 'bg-green-50 border-green-300' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex-1">
                <h3 className={`font-medium text-sm sm:text-base flex items-center gap-2 ${
                  emailPreferences.marketing ? 'text-green-900' : 'text-blue-900'
                }`}>
                  Educational Updates
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    emailPreferences.marketing 
                      ? 'bg-green-200 text-green-700' 
                      : 'bg-blue-200 text-blue-700'
                  }`}>Optional</span>
                </h3>
                <p className={`text-xs sm:text-sm ${
                  emailPreferences.marketing ? 'text-green-700' : 'text-blue-700'
                }`}>
                  Receive helpful GCSE Geography tips, study resources, and product updates via email
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  emailPreferences.marketing 
                    ? 'bg-green-600 border-green-600' 
                    : 'border-gray-300 bg-white hover:border-green-300'
                } ${emailPreferences.loading ? 'opacity-50' : ''}`}>
                  {emailPreferences.marketing && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={emailPreferences.marketing}
                  onChange={(e) => updateEmailPreference('marketing', e.target.checked)}
                  disabled={emailPreferences.loading}
                  className="sr-only"
                />
                <span className={`ml-2 text-sm font-medium ${
                  emailPreferences.marketing ? 'text-green-900' : 'text-blue-900'
                }`}>
                  {emailPreferences.marketing ? 'Subscribed' : 'Unsubscribed'}
                </span>
              </label>
            </div>
            
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> You can change this preference anytime. We never share your email address with third parties.
                Unsubscribe links are included in all marketing emails.
              </p>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            Data Management
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 text-sm sm:text-base">Export Your Data</h3>
                <p className="text-xs sm:text-sm text-blue-700">Download all your river walk data in JSON format</p>
              </div>
              <button
                onClick={handleExportData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            Account Actions
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Sign Out</h3>
                <p className="text-xs sm:text-sm text-gray-600">Sign out of your account on this device</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm w-full sm:w-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass rounded-2xl p-4 sm:p-6 border border-red-200 bg-red-50/50">
          <h2 className="text-lg sm:text-xl font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            Danger Zone
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2 text-sm sm:text-base">Delete Account Permanently</h3>
              <p className="text-xs sm:text-sm text-red-700 mb-4">
                This action will permanently delete your account and all associated data, including:
              </p>
              <ul className="text-xs sm:text-sm text-red-700 mb-4 list-disc list-inside space-y-1">
                <li>Your email address and login credentials</li>
                <li>All river walks you own ({accountStats.riverWalks} river walks)</li>
                <li>All site data and measurements ({accountStats.totalSites} sites)</li>
                <li>All uploaded photos and files</li>
                <li>Your subscription and payment history</li>
                <li>All collaboration invites you've sent</li>
              </ul>
              <p className="text-xs sm:text-sm text-red-700 mb-4 font-medium">
                ⚠️ This action cannot be undone. Projects you've collaborated on (but don't own) will remain intact.
              </p>
              
              {!showDeleteConfirmation ? (
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-red-900 mb-2">
                      Type "DELETE MY ACCOUNT" to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmationText !== 'DELETE MY ACCOUNT' || isDeletingAccount}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm justify-center flex-1 sm:flex-none"
                    >
                      {isDeletingAccount ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Permanently Delete Account</span>
                          <span className="sm:hidden">Delete Account</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setDeleteConfirmationText('');
                      }}
                      disabled={isDeletingAccount}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}