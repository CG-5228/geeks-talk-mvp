"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tag, Plus, X, Edit3 } from 'lucide-react';
import { useStyledDialog } from '../ui/StyledDialog';
import { useNotifications } from '../ui/NotificationSystem';

interface GroupTagsProps {
  groupId: string;
}

export default function GroupTags({ groupId }: GroupTagsProps) {
  const { data: session } = useSession();
  const [tags, setTags] = useState<string[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showDialog, DialogComponent } = useStyledDialog();
  const { showNotification } = useNotifications();

  useEffect(() => {
    fetchTags();
  }, [groupId]);

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
        setCanEdit(data.canEdit || false);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && tags.length < 3) {
      const trimmedTag = newTag.trim();
      if (!tags.includes(trimmedTag)) {
        setTags(prev => [...prev, trimmedTag]);
        setNewTag('');
      } else {
        showNotification({
          title: 'Tag Already Exists',
          message: 'This tag is already added to the group.',
          type: 'warning',
          duration: 3000,
        });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTags = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (response.ok) {
        showNotification({
          title: 'Tags Updated',
          message: 'Group tags have been updated successfully.',
          type: 'success',
          duration: 3000,
        });
        setIsEditing(false);
      } else {
        const error = await response.json();
        showNotification({
          title: 'Update Failed',
          message: error.error || 'Failed to update tags. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error saving tags:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to save tags. Please check your connection and try again.',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    fetchTags(); // Reset to original tags
    setIsEditing(false);
    setNewTag('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-border/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-400" />
          Group Tags
        </h3>
        
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>

      {tags.length === 0 && !isEditing ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No tags added yet</p>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Add tags to help others find this group
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Display Tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs"
              >
                <span>#{tag}</span>
                {isEditing && canEdit && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 rounded-full hover:bg-blue-500/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Tag */}
          {isEditing && canEdit && tags.length < 3 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 text-sm bg-white/5 border border-border/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={20}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Edit Controls */}
          {isEditing && canEdit && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveTags}
                disabled={saving}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save Tags'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-border/20 text-foreground rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Tag Limit Info */}
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              {tags.length}/3 tags used. Tags help others find your group.
            </p>
          )}
        </div>
      )}

      <DialogComponent />
    </div>
  );
}
