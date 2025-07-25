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
        relative rounded-lg font-medium transition-all duration-300 ease-out flex items-center justify-center min-w-0 flex-shrink-0 overflow-hidden
        ${isActive 
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
        /* Mobile: Dynamic width based on active state */
        ${isActive ? 'w-auto px-3' : 'w-12'} h-12 
        /* Desktop: Always full width */
        sm:w-auto sm:px-4 sm:py-2.5 sm:h-auto
      `}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        {/* Icon - always visible */}
        <div className="flex-shrink-0">
          {icon}
        </div>
        
        {/* Label with drawer animation on mobile */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isActive 
            ? 'max-w-[120px] opacity-100' 
            : 'max-w-0 opacity-0'
          }
          /* Always visible on desktop */
          sm:max-w-none sm:opacity-100
        `}>
          <span className="text-sm font-medium">
            {label}
          </span>
        </div>
        
        {/* Count badge with animation */}
        {count > 0 && (
          <div className={`
            overflow-hidden transition-all duration-300 ease-out flex-shrink-0
            ${isActive 
              ? 'max-w-[40px] opacity-100 ml-1' 
              : 'max-w-0 opacity-0 ml-0'
            }
            /* Always visible on desktop */
            sm:max-w-none sm:opacity-100 sm:ml-0
          `}>
            <span className={`
              rounded-full text-xs font-semibold min-w-[1.5rem] text-center px-2 py-0.5
              ${isActive 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {count}
            </span>
          </div>
        )}
      </div>
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

  // Get active tab info for mobile display
  const activeTabInfo = visibleTabs.find(tab => tab.id === activeTab);

  return (
    <div className="mb-6">
      {/* Mobile: Active tab label */}
      <div className="sm:hidden mb-3 text-center">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
          {activeTabInfo?.icon}
          <span className="animate-in slide-in-from-left-2 duration-300">
            {activeTabInfo?.label}
          </span>
          {activeTabInfo && activeTabInfo.count > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium animate-in zoom-in-50 duration-300">
              {activeTabInfo.count}
            </span>
          )}
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 p-1 bg-gray-50 rounded-xl">
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