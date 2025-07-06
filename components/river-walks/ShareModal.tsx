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
    <div className="bg-white w-full h-full sm:rounded-lg sm:shadow-modern-lg sm:max-w-2xl sm:w-full sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Share River Walk</h2>
            <p className="text-sm text-muted-foreground mt-1">{riverWalk.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-colors ${
              activeTab === 'share'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link className="w-4 h-4 inline mr-2" />
            Create Link
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Manage Access ({activeCollaborators.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInviteRole('editor')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      inviteRole === 'editor'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Editor</div>
                    <div className="text-xs text-muted-foreground">Can edit and view</div>
                  </button>
                  <button
                    onClick={() => setInviteRole('viewer')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      inviteRole === 'viewer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Viewer</div>
                    <div className="text-xs text-muted-foreground">Can only view</div>
                  </button>
                </div>
              </div>

              {/* Email Option */}
              <div>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSpecificEmail}
                    onChange={(e) => setUseSpecificEmail(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Send to specific email address</span>
                </label>
                {useSpecificEmail && (
                  <>
                    <input
                      type="email"
                      value={specificEmail}
                      onChange={(e) => setSpecificEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="mt-2 w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="font-medium text-blue-900 mb-1">Email-specific invites:</p>
                      <ul className="text-blue-800 space-y-1">
                        <li>• Can only be used by the specified email address</li>
                        <li>• More secure for controlled sharing</li>
                        <li>• Still expires after 7 days</li>
                      </ul>
                    </div>
                  </>
                )}
                {!useSpecificEmail && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                    <p className="font-medium text-orange-900 mb-1">Public links ("Anyone with link"):</p>
                    <ul className="text-orange-800 space-y-1">
                      <li>• <strong>One-time use only</strong> - link becomes invalid after first use</li>
                      <li>• Can be used by anyone who has the link</li>
                      <li>• Expires after 7 days if unused</li>
                      <li>• More convenient but less secure</li>
                    </ul>
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
        <div className="px-6 py-4 bg-muted/50 border-t border-border">
          <div className="flex justify-between items-start">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>📅 All links expire after 7 days</p>
              <p>🔐 Email-specific links are more secure</p>
              <p>⚠️ Public links are one-time use only</p>
            </div>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
  );
}