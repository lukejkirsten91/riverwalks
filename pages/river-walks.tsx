import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { LogOut, MapPin, User } from 'lucide-react';
import {
  RiverWalkForm,
  RiverWalkList,
  SiteManagement,
} from '../components/river-walks';
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

  const {
    riverWalks,
    loading,
    error,
    setError,
    handleCreateRiverWalk,
    handleUpdateRiverWalk,
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this river walk?')) {
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
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background flex items-center justify-center p-8">
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
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Top navigation with profile */}
        <div className="flex justify-end items-center gap-3 mb-6">
          {user && (
            <div className="flex items-center gap-3">
              {/* Compact profile indicator */}
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:block">{user.email}</span>
              </div>
              
              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="flex items-center text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200 touch-manipulation border border-white/30"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Modern header with glassmorphism */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">River Walks</h1>
                <p className="text-muted-foreground text-sm">Manage your river study documentation</p>
              </div>
            </div>

            {/* Add River Walk button */}
            <button
              className={showForm ? "btn-secondary touch-manipulation" : "btn-primary touch-manipulation"}
              onClick={handleAddNewRiverWalk}
            >
              {showForm ? 'Cancel' : '+ Add River Walk'}
            </button>
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

        {/* Form section */}
        {showForm && (
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
          riverWalks={riverWalks}
          onUpdateField={handleUpdateField}
          onDelete={handleDelete}
          onManageSites={handleManageSites}
        />

        {/* Site management modal */}
        {selectedRiverWalk && (
          <SiteManagement
            riverWalk={selectedRiverWalk}
            onClose={handleCloseSiteManagement}
          />
        )}
      </div>
    </div>
  );
}
