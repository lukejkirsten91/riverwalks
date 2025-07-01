import React from 'react';
import type { CollaboratorInfo } from '../../hooks/useCollaboratorInfo';

interface CollaboratorAvatarsProps {
  collaboratorInfo: CollaboratorInfo | null;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function CollaboratorAvatars({ 
  collaboratorInfo, 
  maxVisible = 3,
  size = 'sm',
  onClick
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

  const containerClasses = onClick 
    ? "flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded-lg p-1 transition-colors" 
    : "flex items-center gap-1";

  return (
    <div className={containerClasses} onClick={onClick}>
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
              ${onClick ? 'hover:scale-110 transition-transform' : ''}
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
              ${onClick ? 'hover:scale-110 transition-transform' : ''}
            `}
            title={`+${remainingCount} more collaborator${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      
      {/* Collaborator count text */}
      <span className={`text-xs text-muted-foreground ml-1 ${onClick ? 'hover:text-foreground transition-colors' : ''}`}>
        {collaboratorCount} collaborator{collaboratorCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}