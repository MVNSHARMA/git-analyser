import { query } from '../../config/db';
import { NotFoundError } from '../../errors';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  repo_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

export async function getNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  let q = 'SELECT * FROM notifications WHERE user_id = $1';
  const params: any[] = [userId];

  if (unreadOnly) {
    q += ' AND read_at IS NULL';
  }

  q += ' ORDER BY created_at DESC LIMIT 50';

  const res = await query<Notification>(q, params);
  return res.rows;
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const res = await query(`
    UPDATE notifications 
    SET read_at = NOW() 
    WHERE id = $1 AND user_id = $2 AND read_at IS NULL
  `, [notificationId, userId]);

  if (res.rowCount === 0) {
    // Check if it exists at all
    const check = await query(`
      SELECT id FROM notifications WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    if (check.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  await query(`
    UPDATE notifications 
    SET read_at = NOW() 
    WHERE user_id = $1 AND read_at IS NULL
  `, [userId]);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const res = await query<{ count: string }>(`
    SELECT COUNT(*) AS count 
    FROM notifications 
    WHERE user_id = $1 AND read_at IS NULL
  `, [userId]);

  return parseInt(res.rows[0]?.count || '0', 10);
}
