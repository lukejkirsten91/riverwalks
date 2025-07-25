import { useState } from 'react';
import { Crown, Users, Share, Archive, MapPin } from 'lucide-react';
import type { RiverWalk } from '../../types';

interface TabButtonProps {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ id, label, count, icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 min-w-0 flex-shrink-0
        ${isActive 
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
      `}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-semibold min-w-[1.5rem] text-center
          ${isActive 
            ? 'bg-white/20 text-white' 
            : 'bg-gray-200 text-gray-600'
          }
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

interface RiverWalkTabsProps {
  riverWalks: RiverWalk[];
  archivedRiverWalks: RiverWalk[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  getCollaboratorInfo: (riverWalkId: string) => { hasCollaborators: boolean } | null;
}

export function RiverWalkTabs({ 
  riverWalks, 
  archivedRiverWalks, 
  activeTab, 
  onTabChange,
  getCollaboratorInfo 
}: RiverWalkTabsProps) {
  // Filter river walks by category
  const myRiverWalks = riverWalks.filter(rw => {
    const isOwned = rw.collaboration_role === 'owner' || 
                   (!rw.collaboration_role && rw.access_type === 'owned') ||
                   (!rw.collaboration_role && !rw.access_type);
    const hasCollaborators = getCollaboratorInfo(rw.id)?.hasCollaborators || false;
    return isOwned && !hasCollaborators; // Owned but not shared with others
  });

  const sharedWithMe = riverWalks.filter(rw => 
    rw.collaboration_role === 'editor' || 
    rw.collaboration_role === 'viewer' ||
    (!rw.collaboration_role && rw.access_type === 'collaborated')
  );
  
  const sharedByMe = riverWalks.filter(rw => {
    const isOwned = rw.collaboration_role === 'owner' || 
                   (!rw.collaboration_role && rw.access_type === 'owned') ||
                   (!rw.collaboration_role && !rw.access_type);
    const hasCollaborators = getCollaboratorInfo(rw.id)?.hasCollaborators || false;
    return isOwned && hasCollaborators; // Owned and shared with others
  });

  const allRiverWalks = riverWalks;

  const tabs = [
    {
      id: 'all',
      label: 'All',
      count: allRiverWalks.length,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: 'my-walks',
      label: 'My Walks',
      count: myRiverWalks.length,
      icon: <Crown className="w-4 h-4" />
    },
    {
      id: 'shared-with-me',
      label: 'Shared with Me',
      count: sharedWithMe.length,
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'shared-by-me',
      label: "I've Shared",
      count: sharedByMe.length,
      icon: <Share className="w-4 h-4" />
    },
    {
      id: 'archived',
      label: 'Archived',
      count: archivedRiverWalks.length,
      icon: <Archive className="w-4 h-4" />
    }
  ];

  // Filter out tabs with zero items (except "All")
  const visibleTabs = tabs.filter(tab => tab.id === 'all' || tab.count > 0);

  return (
    <div className="mb-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            count={tab.count}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
      
      {/* Tab indicator line - purely visual enhancement */}
      <div className="mt-3 h-px bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-20"></div>
    </div>
  );
}