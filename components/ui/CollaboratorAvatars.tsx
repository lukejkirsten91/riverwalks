import React from 'react';
import type { CollaboratorInfo } from '../../hooks/useCollaboratorInfo';

interface CollaboratorAvatarsProps {
  collaboratorInfo: CollaboratorInfo | null;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function CollaboratorAvatars({ 
  collaboratorInfo, 
  maxVisible = 3,
  size = 'sm' 
}: CollaboratorAvatarsProps) {
  if (!collaboratorInfo || !collaboratorInfo.hasCollaborators) {
    return null;
  }

  const { collaboratorInitials, collaboratorCount } = collaboratorInfo;
  const visibleInitials = collaboratorInitials.slice(0, maxVisible);
  const remainingCount = Math.max(0, collaboratorCount - maxVisible);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500'
  ];

  return (
    <div className="flex items-center gap-1">
      {/* Collaborator avatars */}
      <div className="flex -space-x-1">
        {visibleInitials.map((initials, index) => (
          <div
            key={index}
            className={`
              ${sizeClasses[size]} 
              ${colors[index % colors.length]} 
              rounded-full 
              flex items-center justify-center 
              text-white font-medium 
              border-2 border-white 
              shadow-sm
            `}
            title={`Collaborator ${index + 1}`}
          >
            {initials}
          </div>
        ))}
        
        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div
            className={`
              ${sizeClasses[size]} 
              bg-gray-400 
              rounded-full 
              flex items-center justify-center 
              text-white font-medium 
              border-2 border-white 
              shadow-sm
            `}
            title={`+${remainingCount} more collaborator${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      
      {/* Collaborator count text */}
      <span className="text-xs text-muted-foreground ml-1">
        {collaboratorCount} collaborator{collaboratorCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}