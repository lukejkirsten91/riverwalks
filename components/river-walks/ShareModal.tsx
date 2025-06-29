import React, { useState } from 'react';
import { X, Link, Copy, Trash2, Users, Plus, Check } from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import type { CollaboratorAccess } from '../../lib/api/collaboration';
import type { RiverWalk } from '../../types';

interface ShareModalProps {
  riverWalk: RiverWalk;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ riverWalk, isOpen, onClose }: ShareModalProps) {
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

  const handleCreateInvite = async () => {
    console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: Starting invite creation', {
      useSpecificEmail,
      specificEmail: specificEmail ? '[EMAIL_PROVIDED]' : '[NO_EMAIL]',
      inviteRole,
      timestamp: new Date().toISOString()
    });
    
    try {
      clearError();
      const email = useSpecificEmail && specificEmail.trim() ? specificEmail.trim() : '*';
      
      console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: About to call createInvite API', {
        email: email === '*' ? 'WILDCARD' : '[EMAIL_PROVIDED]',
        role: inviteRole
      });
      
      const result = await createInvite(email, inviteRole);
      
      console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: API call successful', {
        hasInviteToken: !!result.invite_token,
        hasInviteUrl: !!result.invite_url,
        tokenLength: result.invite_token ? result.invite_token.length : 0,
        urlLength: result.invite_url ? result.invite_url.length : 0
      });
      
      // Copy to clipboard
      console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: About to copy to clipboard', {
        clipboardSupported: !!navigator.clipboard,
        urlToWrite: result.invite_url
      });
      
      try {
        await navigator.clipboard.writeText(result.invite_url);
        console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: Clipboard copy successful');
        setCopiedToken(result.invite_token);
      } catch (clipboardError) {
        console.error('🔍 [DEBUG] ShareModal.handleCreateInvite: Clipboard copy failed', {
          error: clipboardError,
          errorName: clipboardError instanceof Error ? clipboardError.name : 'unknown',
          errorMessage: clipboardError instanceof Error ? clipboardError.message : String(clipboardError),
          isNotAllowedError: clipboardError instanceof Error && clipboardError.name === 'NotAllowedError'
        });
        // Don't throw - invite was created successfully, just clipboard failed
        setCopiedToken(result.invite_token); // Still show as copied for UI
      }
      
      // Clear form
      setSpecificEmail('');
      setUseSpecificEmail(false);
      
      // Auto-clear copied state after 3 seconds
      setTimeout(() => setCopiedToken(null), 3000);
      
      console.log('🔍 [DEBUG] ShareModal.handleCreateInvite: Invite creation process completed successfully');
    } catch (err) {
      console.error('🔍 [DEBUG] ShareModal.handleCreateInvite: API call failed', {
        error: err,
        errorName: err instanceof Error ? err.name : 'unknown',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined
      });
      console.error('Failed to create invite:', err);
    }
  };

  const handleCopyLink = async (url: string, token: string) => {
    console.log('🔍 [DEBUG] ShareModal.handleCopyLink: Starting clipboard copy', {
      hasUrl: !!url,
      hasToken: !!token,
      urlLength: url ? url.length : 0,
      clipboardSupported: !!navigator.clipboard
    });
    
    try {
      await navigator.clipboard.writeText(url);
      console.log('🔍 [DEBUG] ShareModal.handleCopyLink: Clipboard copy successful');
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err) {
      console.error('🔍 [DEBUG] ShareModal.handleCopyLink: Clipboard copy failed', {
        error: err,
        errorName: err instanceof Error ? err.name : 'unknown',
        errorMessage: err instanceof Error ? err.message : String(err),
        isNotAllowedError: err instanceof Error && err.name === 'NotAllowedError'
      });
      console.error('Failed to copy link:', err);
    }
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

  return (
    <div className="bg-white rounded-lg shadow-modern-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
                  <input
                    type="email"
                    value={specificEmail}
                    onChange={(e) => setSpecificEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="mt-2 w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
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
                    {pendingInvites.map((invite: CollaboratorAccess) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {invite.user_email === '*' ? 'Anyone with link' : invite.user_email}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {invite.role} • Created {new Date(invite.invited_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {invite.invite_token && (
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
                          {isOwner() && (
                            <button
                              onClick={() => handleRevokeAccess(invite.id)}
                              className="p-2 hover:bg-background rounded transition-colors text-red-600"
                              title="Remove invite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Links expire after 7 days
            </p>
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