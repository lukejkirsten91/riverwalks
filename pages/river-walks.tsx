import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { LogOut, MapPin, User as UserIcon } from 'lucide-react';
import {
  RiverWalkForm,
  RiverWalkList,
  SiteManagement,
} from '../components/river-walks';
import { DiagnosticPanel } from '../components/DiagnosticPanel';
import { StorageSetupHelper } from '../components/StorageSetupHelper';
import { useRiverWalks } from '../hooks/useRiverWalks';
import type { RiverWalk, RiverWalkFormData } from '../types';
import type { User } from '@supabase/supabase-js';

export default function RiverWalksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentRiverWalk, setCurrentRiverWalk] = useState<RiverWalk | null>(
    null
  );
  const [selectedRiverWalk, setSelectedRiverWalk] = useState<RiverWalk | null>(
    null
  );
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const {
    riverWalks,
    archivedRiverWalks,
    showArchived,
    setShowArchived,
    loading,
    error,
    setError,
    handleCreateRiverWalk,
    handleUpdateRiverWalk,
    handleArchiveRiverWalk,
    handleRestoreRiverWalk,
    handleDeleteRiverWalk,
  } = useRiverWalks();

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
    };

    checkUser();
  }, [router]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showProfileDropdown && !target.closest('[data-profile-dropdown]')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleFormSubmit = async (formData: RiverWalkFormData) => {
    try {
      if (currentRiverWalk) {
        await handleUpdateRiverWalk(currentRiverWalk.id, formData);
      } else {
        await handleCreateRiverWalk(formData);
      }

      // Reset form state
      setShowForm(false);
      setCurrentRiverWalk(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setCurrentRiverWalk(null);
  };

  const handleUpdateField = async (id: string, field: keyof RiverWalk, value: string) => {
    // Find the existing river walk to get current values
    const existingRiverWalk = riverWalks.find(rw => rw.id === id);
    if (!existingRiverWalk) return;
    
    // Create complete update data with current values plus the changed field
    const updateData: RiverWalkFormData = {
      name: field === 'name' ? value : existingRiverWalk.name,
      date: field === 'date' ? value : existingRiverWalk.date,
      country: field === 'country' ? value : existingRiverWalk.country,
      county: field === 'county' ? value : (existingRiverWalk.county || ''),
    };
    
    await handleUpdateRiverWalk(id, updateData);
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Are you sure you want to archive this river walk? You can restore it later.')) {
      await handleArchiveRiverWalk(id);
    }
  };

  const handleRestore = async (id: string) => {
    await handleRestoreRiverWalk(id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this river walk? This cannot be undone.')) {
      await handleDeleteRiverWalk(id);
    }
  };

  const handleManageSites = (riverWalk: RiverWalk) => {
    setSelectedRiverWalk(riverWalk);
  };

  const handleCloseSiteManagement = () => {
    setSelectedRiverWalk(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddNewRiverWalk = () => {
    setShowForm(!showForm);
    setCurrentRiverWalk(null);
  };

  // Loading state
  if (loading && !riverWalks.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-slate-100 flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading River Walks</h1>
          <p className="text-muted-foreground">Preparing your study data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-slate-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Top navigation with profile */}
        <div className="flex justify-end items-center mb-6">
          {user && (
            <div className="relative" data-profile-dropdown>
              {/* Profile button */}
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200 touch-manipulation border border-white/30"
                title="Profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:block text-sm">{user.email}</span>
              </button>

              {/* Dropdown menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-modern border border-white/30 py-2 z-50">
                  <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                    Signed in as
                  </div>
                  <div className="px-4 py-2 text-sm font-medium text-foreground border-b border-border">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modern header with glassmorphism */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Riverwalks Logo" 
                className="h-12 w-12 rounded-xl object-contain"
              />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Your River Walks</h1>
                <p className="text-muted-foreground text-sm">Manage your river study documentation</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Archive toggle button */}
              <button
                className={showArchived ? "btn-secondary touch-manipulation" : "btn-warning touch-manipulation"}
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? `Active (${riverWalks.length})` : `Archived (${archivedRiverWalks.length})`}
              </button>

              {/* Add River Walk button - only show when not viewing archived */}
              {!showArchived && (
                <button
                  className={showForm ? "btn-secondary touch-manipulation" : "btn-primary touch-manipulation"}
                  onClick={handleAddNewRiverWalk}
                >
                  {showForm ? 'Cancel' : '+ Add River Walk'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button 
              className="text-destructive hover:text-destructive/80 text-xl font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Form section - only show when not viewing archived */}
        {showForm && !showArchived && (
          <div className="mb-8">
            <RiverWalkForm
              currentRiverWalk={currentRiverWalk}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              loading={loading}
            />
          </div>
        )}

        {/* River walks list */}
        <RiverWalkList
          riverWalks={showArchived ? archivedRiverWalks : riverWalks}
          onUpdateField={handleUpdateField}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onManageSites={handleManageSites}
          showArchived={showArchived}
        />

        {/* Site management modal */}
        {selectedRiverWalk && (
          <SiteManagement
            riverWalk={selectedRiverWalk}
            onClose={handleCloseSiteManagement}
          />
        )}
      </div>
      
      {/* Diagnostic Panel for debugging photo uploads */}
      <DiagnosticPanel />
      
      {/* Storage Setup Helper */}
      <StorageSetupHelper />
    </div>
  );
}
