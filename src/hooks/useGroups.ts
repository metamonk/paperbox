/**
 * Canvas groups hook for hierarchical organization
 * Manages CRUD operations for groups and group membership
 * 
 * Note: Supabase type casts required for generic query builder compatibility
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Supabase's generic types cause false positives in strict mode

import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { CanvasGroup } from '../types/canvas';
import type { Database } from '../types/database';

type DbCanvasGroup = Database['public']['Tables']['canvas_groups']['Row'];

export interface UseGroupsResult {
  groups: CanvasGroup[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createGroup: (name: string, parentGroupId?: string | null) => Promise<string | null>;
  updateGroup: (id: string, updates: Partial<CanvasGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  
  // Group membership
  addToGroup: (objectIds: string[], groupId: string) => Promise<void>;
  removeFromGroup: (objectIds: string[]) => Promise<void>;
  
  // Group operations
  lockGroup: (groupId: string) => Promise<void>;
  unlockGroup: (groupId: string) => Promise<void>;
  
  // Queries
  getGroupById: (id: string) => CanvasGroup | undefined;
  getChildGroups: (parentId: string | null) => CanvasGroup[];
  getGroupHierarchy: (groupId: string) => CanvasGroup[];
}

/**
 * Hook for managing canvas groups
 */
export function useGroups(): UseGroupsResult {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CanvasGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert database row to CanvasGroup
   */
  const dbToGroup = useCallback((row: DbCanvasGroup): CanvasGroup => {
    return {
      id: row.id,
      name: row.name,
      parent_group_id: row.parent_group_id,
      locked: row.locked,
      z_index: row.z_index,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }, []);

  /**
   * Create a new group
   */
  const createGroup = useCallback(async (
    name: string,
    parentGroupId: string | null = null
  ): Promise<string | null> => {
    if (!user) {
      console.error('Cannot create group: user not authenticated');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('canvas_groups')
        .insert({
          name,
          parent_group_id: parentGroupId,
          locked: false,
          z_index: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      console.log('✅ Group created:', data.id);
      return data.id;
    } catch (err) {
      console.error('❌ Error creating group:', err);
      setError('Failed to create group. Please try again.');
      setTimeout(() => setError(null), 3000);
      return null;
    }
  }, [user]);

  /**
   * Update an existing group
   */
  const updateGroup = useCallback(async (
    id: string,
    updates: Partial<CanvasGroup>
  ): Promise<void> => {
    try {
      const updateData: Record<string, any> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.parent_group_id !== undefined) updateData.parent_group_id = updates.parent_group_id;
      if (updates.locked !== undefined) updateData.locked = updates.locked;
      if (updates.z_index !== undefined) updateData.z_index = updates.z_index;

      const { error: updateError } = await supabase
        .from('canvas_groups')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      
      console.log('✅ Group updated:', id);
    } catch (err) {
      console.error('❌ Error updating group:', err);
    }
  }, []);

  /**
   * Delete a group
   * Cascade deletes all child groups
   * Sets group_id to null for all objects in the group
   */
  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('canvas_groups')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      console.log('✅ Group deleted:', id);
    } catch (err) {
      console.error('❌ Error deleting group:', err);
      setError('Failed to delete group. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  /**
   * Add objects to a group
   */
  const addToGroup = useCallback(async (
    objectIds: string[],
    groupId: string
  ): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from('canvas_objects')
        .update({ group_id: groupId })
        .in('id', objectIds);

      if (updateError) throw updateError;
      
      console.log(`✅ Added ${objectIds.length} objects to group ${groupId}`);
    } catch (err) {
      console.error('❌ Error adding objects to group:', err);
      setError('Failed to add objects to group. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  /**
   * Remove objects from their group
   */
  const removeFromGroup = useCallback(async (objectIds: string[]): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from('canvas_objects')
        .update({ group_id: null })
        .in('id', objectIds);

      if (updateError) throw updateError;
      
      console.log(`✅ Removed ${objectIds.length} objects from groups`);
    } catch (err) {
      console.error('❌ Error removing objects from group:', err);
    }
  }, []);

  /**
   * Lock a group (prevents manipulation of all objects in the group)
   */
  const lockGroup = useCallback(async (groupId: string): Promise<void> => {
    await updateGroup(groupId, { locked: true });
  }, [updateGroup]);

  /**
   * Unlock a group
   */
  const unlockGroup = useCallback(async (groupId: string): Promise<void> => {
    await updateGroup(groupId, { locked: false });
  }, [updateGroup]);

  /**
   * Get group by ID
   */
  const getGroupById = useCallback((id: string): CanvasGroup | undefined => {
    return groups.find(g => g.id === id);
  }, [groups]);

  /**
   * Get all child groups of a parent
   * Pass null to get root-level groups
   */
  const getChildGroups = useCallback((parentId: string | null): CanvasGroup[] => {
    return groups.filter(g => g.parent_group_id === parentId);
  }, [groups]);

  /**
   * Get full hierarchy path for a group (from root to group)
   * Returns array of groups from root to specified group
   */
  const getGroupHierarchy = useCallback((groupId: string): CanvasGroup[] => {
    const hierarchy: CanvasGroup[] = [];
    let currentId: string | null = groupId;
    
    while (currentId) {
      const group = getGroupById(currentId);
      if (!group) break;
      
      hierarchy.unshift(group); // Add to beginning
      currentId = group.parent_group_id;
    }
    
    return hierarchy;
  }, [getGroupById]);

  /**
   * Fetch initial groups and set up real-time subscription
   */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        console.log('🔄 Fetching initial canvas groups...');
        
        // Fetch initial groups
        const { data, error: fetchError } = await supabase
          .from('canvas_groups')
          .select('*')
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const canvasGroups = data.map(dbToGroup);
        setGroups(canvasGroups);
        setLoading(false);
        
        console.log(`✅ Loaded ${canvasGroups.length} canvas groups`);

        // Set up real-time subscription
        const channelName = `canvas-groups-${user.id}-${Date.now()}`;
        console.log(`🔌 Creating unique channel: ${channelName}`);
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'canvas_groups',
            },
            (payload) => {
              console.log('📥 GROUP INSERT event:', payload.new);
              const newGroup = dbToGroup(payload.new as DbCanvasGroup);
              setGroups((prev) => {
                // Prevent duplicates
                if (prev.some(g => g.id === newGroup.id)) {
                  return prev;
                }
                return [...prev, newGroup];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'canvas_groups',
            },
            (payload) => {
              console.log('📝 GROUP UPDATE event:', payload.new);
              const updatedGroup = dbToGroup(payload.new as DbCanvasGroup);
              setGroups((prev) =>
                prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'canvas_groups',
            },
            (payload) => {
              console.log('🗑️ GROUP DELETE event:', payload.old);
              setGroups((prev) => prev.filter((g) => g.id !== payload.old.id));
            }
          )
          .subscribe((status) => {
            if (!mounted) return;
            
            console.log('📡 Groups realtime subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to canvas-groups realtime channel');
              setError(null);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error(`⚠️ Groups subscription error: ${status}`);
              setError('Connection lost. Please refresh the page.');
            }
          });
      } catch (err) {
        console.error('❌ Error setting up groups realtime:', err);
        setError('Failed to load canvas groups. Please refresh the page.');
        setLoading(false);
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (channel) {
        console.log('🧹 Cleaning up groups realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [user, dbToGroup]);

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addToGroup,
    removeFromGroup,
    lockGroup,
    unlockGroup,
    getGroupById,
    getChildGroups,
    getGroupHierarchy,
  };
}

