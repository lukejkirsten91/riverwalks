import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { Home, LogOut } from 'lucide-react';
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

  const handleEdit = (riverWalk: RiverWalk) => {
    setCurrentRiverWalk(riverWalk);
    setShowForm(true);
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
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">River Walks</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">River Walks</h1>
          {user && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              ✓ Logged in as {user.email}
            </div>
          )}
          <div className="flex space-x-2">
            <Link href="/">
              <button className="flex items-center text-gray-600 hover:text-gray-800 px-3 py-1 rounded">
                <Home className="w-4 h-4 mr-1" />
                Home
              </button>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center text-gray-600 hover:text-gray-800 px-3 py-1 rounded"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleAddNewRiverWalk}
        >
          {showForm ? 'Cancel' : 'Add River Walk'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
          <button className="float-right" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {showForm && (
        <RiverWalkForm
          currentRiverWalk={currentRiverWalk}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={loading}
        />
      )}

      <RiverWalkList
        riverWalks={riverWalks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onManageSites={handleManageSites}
      />

      {selectedRiverWalk && (
        <SiteManagement
          riverWalk={selectedRiverWalk}
          onClose={handleCloseSiteManagement}
        />
      )}
    </div>
  );
}
