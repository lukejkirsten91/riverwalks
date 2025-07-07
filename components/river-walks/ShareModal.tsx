import React, { useState } from 'react';
import { X, Link, Copy, Trash2, Users, Plus, Check } from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import type { CollaboratorAccess } from '../../lib/api/collaboration';
import type { RiverWalk } from '../../types';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ShareModalProps {
  riverWalk: RiverWalk;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ riverWalk, isOpen, onClose }: ShareModalProps) {
  useScrollLock(isOpen);
  
  const {
    collaborators,
    isLoading,
    error,
    createInvite,
    revokeAccess,
    clearError,
    isOwner,
    collaborationEnabled
  } = useCollaboration(riverWalk.id);

  const [activeTab, setActiveTab] = useState<'share' | 'manage'>('share');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [specificEmail, setSpecificEmail] = useState('');
  const [useSpecificEmail, setUseSpecificEmail] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Don't render if collaboration is disabled
  if (!collaborationEnabled) {
    return null;
  }

  if (!isOpen) return null;

  // Enhanced clipboard function with fallback for Mac
  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Modern clipboard failed, trying fallback:', err);
      }
    }
    
    // Fallback for older browsers or when clipboard API fails
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Try the old execCommand method
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return true;
      }
    } catch (err) {
      console.error('Fallback clipboard failed:', err);
    }
    
    return false;
  };

  const handleCreateInvite = async () => {
    try {
      clearError();
      const email = useSpecificEmail && specificEmail.trim() ? specificEmail.trim() : '*';
      const result = await createInvite(email, inviteRole);
      
      const copySuccess = await copyToClipboard(result.invite_url);
      setCopiedToken(result.invite_token);
      
      // Clear form
      setSpecificEmail('');
      setUseSpecificEmail(false);
      
      // Auto-clear copied state after 3 seconds
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err) {
      console.error('Failed to create invite:', err);
      // Error will be handled by the useCollaboration hook
    }
  };

  const handleCopyLink = async (url: string, token: string) => {
    const copySuccess = await copyToClipboard(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevokeAccess = async (collaboratorId: string) => {
    try {
      clearError();
      await revokeAccess(collaboratorId);
    } catch (err) {
      console.error('Failed to revoke access:', err);
    }
  };

  const activeCollaborators = collaborators.filter((c: CollaboratorAccess) => c.accepted_at !== null);
  const pendingInvites = collaborators.filter((c: CollaboratorAccess) => c.accepted_at === null);
  
  // Helper function to get invite status
  const getInviteStatus = (invite: CollaboratorAccess) => {
    const now = new Date();
    const expiresAt = invite.invite_expires_at ? new Date(invite.invite_expires_at) : null;
    
    if (invite.accepted_at) {
      return { type: 'accepted', label: '✅ Accepted', color: 'text-green-600' };
    } else if (expiresAt && now > expiresAt) {
      return { type: 'expired', label: '⏰ Expired', color: 'text-red-600' };
    } else if (invite.user_email === '*') {
      // For public links, we can't tell if they've been "used" without acceptance
      // But we can show if they're still valid
      return { type: 'pending-public', label: '🔗 Active (One-time use)', color: 'text-orange-600' };
    } else {
      return { type: 'pending', label: '⏳ Pending', color: 'text-blue-600' };
    }
  };

  return (
    <div className="bg-white w-full h-full sm:rounded-lg sm:shadow-modern-lg sm:max-w-2xl sm:w-full sm:max-h-[80vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-blue-50 to-teal-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Share River Walk
            </h2>
            <p className="text-sm text-blue-700 mt-1 font-medium">{riverWalk.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-gray-50">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-all ${
              activeTab === 'share'
                ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Link className="w-4 h-4 inline mr-2" />
            Create Link
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-all ${
              activeTab === 'manage'
                ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Manage Access ({activeCollaborators.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-6">
              {/* Role Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  📋 Choose Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInviteRole('editor')}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-sm ${
                      inviteRole === 'editor'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">✏️ Editor</div>
                    <div className="text-xs text-gray-600 mt-1">Can edit and view data</div>
                  </button>
                  <button
                    onClick={() => setInviteRole('viewer')}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-sm ${
                      inviteRole === 'viewer'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">👁️ Viewer</div>
                    <div className="text-xs text-gray-600 mt-1">Can only view data</div>
                  </button>
                </div>
              </div>

              {/* Email Option */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="flex items-center space-x-3 text-sm font-medium text-gray-900 mb-3">
                  <input
                    type="checkbox"
                    checked={useSpecificEmail}
                    onChange={(e) => setUseSpecificEmail(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>📧 Send to specific email address</span>
                </label>
                {useSpecificEmail ? (
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={specificEmail}
                      onChange={(e) => setSpecificEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-blue-900 text-sm">🔒 More secure sharing</p>
                      <p className="text-blue-700 text-sm mt-1">Only the specified email can use this link</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="font-medium text-orange-900 text-sm">🔗 Public link sharing</p>
                    <div className="text-orange-700 text-sm mt-2 space-y-1">
                      <p>• <strong>One-time use only</strong> - link expires after first person uses it</p>
                      <p>• Perfect for quick sharing with classmates</p>
                      <p>• Expires after 7 days if unused</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateInvite}
                disabled={isLoading || (useSpecificEmail && !specificEmail.trim())}
                className="w-full btn-primary"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Link...
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sharing Link
                  </>
                )}
              </button>

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Pending Invites</h3>
                  <div className="space-y-2">
                    {pendingInvites.map((invite: CollaboratorAccess) => {
                      const status = getInviteStatus(invite);
                      return (
                        <div
                          key={invite.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            status.type === 'expired' ? 'bg-red-50 border-red-200' : 
                            status.type === 'pending-public' ? 'bg-orange-50 border-orange-200' :
                            'bg-muted border-border'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium">
                                {invite.user_email === '*' ? 'Anyone with link' : invite.user_email}
                              </div>
                              <span className={`text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="capitalize">{invite.role}</span>
                              <span> • Created {new Date(invite.invited_at).toLocaleDateString()}</span>
                              <span> • Expires {invite.invite_expires_at ? new Date(invite.invite_expires_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {invite.user_email === '*' && status.type !== 'expired' && (
                              <div className="text-orange-600 font-medium mt-1 text-xs">
                                ⚠️ Will become invalid after first use
                              </div>
                            )}
                            {status.type === 'expired' && (
                              <div className="text-red-600 font-medium mt-1 text-xs">
                                🚫 This link has expired and can no longer be used
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {invite.invite_token && status.type !== 'expired' && (
                              <button
                                onClick={() => handleCopyLink(
                                  `https://riverwalks.co.uk/invite/${invite.invite_token}`,
                                  invite.invite_token!
                                )}
                                className="p-2 hover:bg-background rounded transition-colors"
                                title="Copy link"
                              >
                                {copiedToken === invite.invite_token ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {status.type === 'expired' && (
                              <div className="p-2 text-gray-400" title="Link expired">
                                <Copy className="w-4 h-4" />
                              </div>
                            )}
                            {isOwner() && (
                              <button
                                onClick={() => handleRevokeAccess(invite.id)}
                                className="p-2 hover:bg-background rounded transition-colors text-red-600"
                                title={status.type === 'expired' ? 'Remove expired invite' : 'Remove invite'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              {activeCollaborators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active collaborators yet</p>
                  <p className="text-sm">Create a sharing link to invite others</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCollaborators.map((collaborator: CollaboratorAccess) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{collaborator.user_email}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {collaborator.role} • Joined {new Date(collaborator.accepted_at!).toLocaleDateString()}
                        </div>
                      </div>
                      {isOwner() && (
                        <button
                          onClick={() => handleRevokeAccess(collaborator.id)}
                          className="p-2 hover:bg-muted rounded transition-colors text-red-600"
                          title="Remove access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-teal-50 border-t border-border">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
  );
}