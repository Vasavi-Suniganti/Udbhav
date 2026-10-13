import { useContext, useState } from 'react';
import { Bell, CheckCheck, FileText } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import { DashboardMotionContext } from '@/components/ui/motion';
import { NotificationDetailsModal } from '@/components/notifications/NotificationDetailsModal';

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default function NotificationDropdown({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { notifications, refresh } = usePlatform();
  const motionEnabled = useContext(DashboardMotionContext);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Notification | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const unread = notifications.filter(notification => !(notification.read || notification.isRead) && !readIds.has(notification.id));
  const recent = notifications.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  async function markAllRead() {
    const ids = unread.map(notification => notification.id);
    setReadIds(current => new Set([...current, ...ids]));
    await api.markAllNotificationsRead(ids);
    await refresh();
  }

  async function markAsRead(notification: Notification) {
    if (notification.read || readIds.has(notification.id)) return;
    setReadIds(current => new Set([...current, notification.id]));
    setSelected(current => current && current.id === notification.id ? { ...current, read: true, isRead: true } : current);
    try {
      await api.markNotificationRead(notification.id);
      await refresh();
    } catch (error) {
      setReadIds(current => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
      setSelected(current => current && current.id === notification.id ? { ...current, read: notification.read, isRead: notification.isRead } : current);
      throw error;
    }
  }

  async function openNotification(notification: Notification) {
    setSelected({ ...notification, read: true, isRead: true });
    setOpen(false);
    if (!notification.read && !readIds.has(notification.id)) {
      await markAsRead(notification);
    }
  }

  async function deleteNotification(notification: Notification) {
    setDeletingId(notification.id);
    setReadIds(current => {
      const next = new Set(current);
      next.delete(notification.id);
      return next;
    });
    const previous = notifications.find(item => item.id === notification.id);
    try {
      await api.deleteNotification(notification.id);
      setSelected(null);
      await refresh();
    } catch (error) {
      if (previous) setSelected(notification);
      throw error;
    } finally {
      setDeletingId(null);
    }
  }

  return <div className="relative">
    <button type="button" className="topbar-icon-control" onClick={() => setOpen(value => !value)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open}>
      <Bell size={18} />
      <AnimatePresence initial={false}>
        {unread.length > 0 && (
          <motion.span
            key={unread.length}
            className="topbar-notification-badge"
            initial={motionEnabled ? { scale: 0.7, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            exit={motionEnabled ? { scale: 0.7, opacity: 0 } : undefined}
            transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
          >
            {unread.length > 9 ? '9+' : unread.length}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
    <AnimatePresence>
    {open && <motion.div
      className="topbar-popover topbar-notification-menu"
      initial={motionEnabled ? { opacity: 0, y: reduceMotion ? 0 : -6, scale: reduceMotion ? 1 : 0.98 } : false}
      animate={motionEnabled ? { opacity: 1, y: 0, scale: 1 } : undefined}
      exit={motionEnabled ? { opacity: 0, y: reduceMotion ? 0 : -4, scale: reduceMotion ? 1 : 0.99 } : undefined}
      transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
    >
      <div className="topbar-popover-header"><div><b>Notifications</b><span>{unread.length ? `${unread.length} unread` : 'All caught up'}</span></div>{unread.length > 0 && <button type="button" className="topbar-text-action" onClick={() => void markAllRead()}><CheckCheck size={14} /> Mark all as read</button>}</div>
      <div className="topbar-notification-list">{recent.length ? recent.map(notification => { const isRead = Boolean(notification.read || notification.isRead || readIds.has(notification.id)); return <button type="button" key={notification.id} className={`topbar-notification-item ${isRead ? '' : 'is-unread'}`} onClick={() => void openNotification(notification)}><span className="topbar-notification-icon"><FileText size={15} /></span><span className="topbar-notification-copy"><b>{notification.title}</b><span>{notification.message}</span><small>{timeAgo(notification.created_at)}</small></span>{!isRead && <i />}</button>; }) : <p className="topbar-empty">No notifications yet.</p>}</div>
      <button type="button" className="topbar-view-all" onClick={() => { onNavigate('/dashboard/notifications'); setOpen(false); }}>View all notifications</button>
    </motion.div>}
    </AnimatePresence>
    {selected && (
      <NotificationDetailsModal
        notification={selected}
        onClose={() => setSelected(null)}
        onKeep={() => setSelected(null)}
        onDelete={async (notification) => {
          await deleteNotification(notification);
        }}
        onMarkRead={async (id) => {
          const current = notifications.find(item => item.id === id);
          if (current && !current.read) {
            await markAsRead(current);
          }
        }}
        deleting={deletingId === selected.id}
      />
    )}
  </div>;
}
