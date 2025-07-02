import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isCollaborationEnabled } from '../lib/api/collaboration';
import type { RiverWalk } from '../types';

export interface CollaboratorInfo {
  riverWalkId: string;
  hasCollaborators: boolean;
  collaboratorCount: number;
  collaboratorEmails: string[];
  collaboratorInitials: string[];
}

/**
 * Hook to fetch collaborator information for multiple river walks efficiently
 * Used for showing avatars and determining if river walks have been shared
 */
export function useCollaboratorInfo(riverWalks: RiverWalk[]) {
  const [collaboratorInfo, setCollaboratorInfo] = useState<Map<string, CollaboratorInfo>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isCollaborationEnabled() || riverWalks.length === 0) {
      return;
    }

    const fetchCollaboratorInfo = async () => {
      setLoading(true);
      
      try {
        // Get owned river walks (ones that might have collaborators)
        const ownedRiverWalkIds = riverWalks
          .filter(rw => 
            rw.collaboration_role === 'owner' || 
            (!rw.collaboration_role && rw.access_type === 'owned') ||
            (!rw.collaboration_role && !rw.access_type)
          )
          .map(rw => rw.id);

        if (ownedRiverWalkIds.length === 0) {
          setLoading(false);
          return;
        }


        // Fetch collaboration metadata and collaborators in one query
        const { data: collaboratorsData, error } = await supabase
          .from('collaborator_access')
          .select(`
            user_email,
            collaboration_metadata!inner (
              river_walk_reference_id
            )
          `)
          .in('collaboration_metadata.river_walk_reference_id', ownedRiverWalkIds)
          .not('accepted_at', 'is', null); // Only accepted collaborators

        if (error) {
          console.error('Error fetching collaborator info:', error);
          setLoading(false);
          return;
        }


        // Process the data into our map structure
        const infoMap = new Map<string, CollaboratorInfo>();
        
        // Initialize all owned river walks
        ownedRiverWalkIds.forEach(riverWalkId => {
          infoMap.set(riverWalkId, {
            riverWalkId,
            hasCollaborators: false,
            collaboratorCount: 0,
            collaboratorEmails: [],
            collaboratorInitials: []
          });
        });

        // Group collaborators by river walk
        const groupedCollaborators = new Map<string, string[]>();
        
        collaboratorsData?.forEach(collab => {
          const riverWalkId = (collab.collaboration_metadata as any)?.river_walk_reference_id;
          if (!riverWalkId) return; // Skip if no river walk ID
          
          if (!groupedCollaborators.has(riverWalkId)) {
            groupedCollaborators.set(riverWalkId, []);
          }
          groupedCollaborators.get(riverWalkId)!.push(collab.user_email);
        });

        // Update info map with collaborator data
        groupedCollaborators.forEach((emails, riverWalkId) => {
          const initials = emails.map(email => {
            const parts = email.split('@')[0].split('.');
            if (parts.length >= 2) {
              return (parts[0][0] + parts[1][0]).toUpperCase();
            } else {
              return email.substring(0, 2).toUpperCase();
            }
          });

          infoMap.set(riverWalkId, {
            riverWalkId,
            hasCollaborators: true,
            collaboratorCount: emails.length,
            collaboratorEmails: emails,
            collaboratorInitials: initials
          });
        });

        setCollaboratorInfo(infoMap);
        
      } catch (error) {
        console.error('Error in useCollaboratorInfo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollaboratorInfo();
  }, [riverWalks]);

  return {
    collaboratorInfo,
    loading,
    getCollaboratorInfo: (riverWalkId: string) => collaboratorInfo.get(riverWalkId) || null
  };
}