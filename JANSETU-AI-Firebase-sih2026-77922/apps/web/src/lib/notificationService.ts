import { collection, deleteDoc, doc, getDoc, limit, onSnapshot, query, serverTimestamp, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Notification } from '@/types';

export type NotificationInput = {
  recipientId: string;
  recipientRole?: string;
  type: string;
  title: string;
  message: string;
  announcementId?: string;
  relatedProblemId?: string;
  relatedProjectId?: string;
  relatedTeamId?: string;
  relatedUniversityId?: string;
  relatedPartnerId?: string;
  relatedUserId?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
};

function resolveOwnerId(value: Record<string, any>): string | undefined {
  return value.recipientId || value.userId || value.targetUserId || value.ownerId || undefined;
}

function normalize(id: string, value: Record<string, any>): Notification {
  const actionLink = value.actionUrl || value.link || value.relatedProblemId || value.relatedProjectId;
  const isRead = Boolean(value.read || value.isRead);
  return {
    id,
    user_id: resolveOwnerId(value) || '',
    title: value.title || 'UDBHAV update',
    message: value.message || '',
    type: value.type || 'GENERAL',
    read: isRead,
    isRead,
    link: value.announcementId ? `/dashboard/announcements/${value.announcementId}` : actionLink,
    announcementId: value.announcementId,
    created_at: value.createdAt?.toDate?.()?.toISOString?.() || value.createdAt || value.created_at || new Date().toISOString(),
  };
}

export function subscribeToNotifications(recipientId: string | undefined, onChange: (items: Notification[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!db || !recipientId) {
    onChange([]);
    return () => undefined;
  }
  const source = query(collection(db, 'notifications'), where('recipientId', '==', recipientId), limit(100));
  return onSnapshot(source, snapshot => {
    const items = snapshot.docs.map(item => normalize(item.id, item.data())).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    onChange(items);
  }, error => onError?.(error));
}

export async function markNotificationRead(id: string) {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to update notifications.');
  const ref = doc(db, 'notifications', id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const data = snapshot.data() as Record<string, any>;
  const ownerId = resolveOwnerId(data);
  if (!ownerId) throw new Error('Notification owner could not be determined.');
  if (ownerId !== auth.currentUser.uid) {
    throw new Error('You do not have permission to update this notification.');
  }
  if (Boolean(data.read || data.isRead)) return;

  await updateDoc(ref, { isRead: true, read: true, readAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function markAllNotificationsRead(ids: string[]) {
  await Promise.all(ids.map(markNotificationRead));
}

export async function deleteNotification(id: string) {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to delete notifications.');
  const ref = doc(db, 'notifications', id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const data = snapshot.data() as Record<string, any>;
  const ownerId = resolveOwnerId(data);
  if (!ownerId) throw new Error('Notification owner could not be determined.');
  if (ownerId !== auth.currentUser.uid) {
    throw new Error('You do not have permission to delete this notification.');
  }

  await deleteDoc(ref);
}

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter(entry => entry !== undefined).map(entry => withoutUndefined(entry)) as T;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    ) as T;
  }
  return value;
}

export function createNotification(input: NotificationInput) {
  return import('firebase/firestore').then(({ addDoc }) => {
    if (!db) throw new Error('Firebase is not configured.');
    return addDoc(collection(db, 'notifications'), withoutUndefined({ ...input, isRead: false, read: false, createdAt: new Date() }) as Record<string, unknown>);
  });
}
