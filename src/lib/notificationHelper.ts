import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error' | 'reminder';
  link?: string;
  relatedId?: string;
  relatedType?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link,
  relatedId,
  relatedType,
}: CreateNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        related_id: relatedId,
        related_type: relatedType,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

export async function notifyRoleUsers(
  role: 'admin' | 'bdo' | 'coo' | 'finance' | 'marketing' | 'project_manager',
  title: string,
  message: string,
  options?: {
    type?: 'info' | 'warning' | 'success' | 'error' | 'reminder';
    link?: string;
    relatedId?: string;
    relatedType?: string;
    excludeUserId?: string;
  }
): Promise<boolean> {
  try {
    // Get all users with the specified role
    const { data: roleUsers, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', role);

    if (roleError) {
      console.error('Error fetching role users:', roleError);
      return false;
    }

    if (!roleUsers || roleUsers.length === 0) {
      return true; // No users with this role
    }

    // Filter out excluded user if specified
    const userIds = roleUsers
      .map(u => u.user_id)
      .filter(id => id !== options?.excludeUserId);

    if (userIds.length === 0) return true;

    // Create notifications for all users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type: options?.type || 'info',
      link: options?.link,
      related_id: options?.relatedId,
      related_type: options?.relatedType,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in notifyRoleUsers:', error);
    return false;
  }
}
