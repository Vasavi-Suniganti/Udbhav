import { useEffect, useMemo, useState } from 'react';
import { Clock3, FileText, Trash2, X } from 'lucide-react';
import type { Notification } from '@/types';

interface NotificationDetailsModalProps {
  notification: Notification;
  onClose: () => void;
  onKeep: () => void;
  onDelete: (notification: Notification) => Promise<void> | void;
  onMarkRead?: (notificationId: string) => Promise<void> | void;
  deleting?: boolean;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function NotificationDetailsModal({
  notification,
  onClose,
  onKeep,
  onDelete,
  onMarkRead,
  deleting = false,
}: NotificationDetailsModalProps) {
  const [busy, setBusy] = useState(false);
  const isRead = Boolean(notification.read || notification.isRead);

  useEffect(() => {
    if (!isRead && onMarkRead) {
      void onMarkRead(notification.id);
    }
  }, [isRead, notification.id, onMarkRead]);

  const relatedText = useMemo(() => {
    const parts = [
      notification.relatedProblemId && 'Problem reference',
      notification.relatedProjectId && 'Project reference',
      notification.announcementId && 'Announcement reference',
      notification.relatedUserId && 'User reference',
      notification.senderId && 'Sender reference',
    ].filter(Boolean);
    return parts.length ? parts.join(' • ') : 'No related item linked';
  }, [notification]);

  async function handleDelete() {
    if (busy || deleting) return;
    setBusy(true);
    try {
      await onDelete(notification);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-neutral-200 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">Notification</p>
            <h2 id="notification-modal-title" className="mt-2 text-xl font-semibold text-primary-900 break-words">
              {notification.title}
            </h2>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close notification details">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          {notification.type ? (
            <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 font-medium text-primary-700">
              {notification.type.replace(/_/g, ' ')}
            </span>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 font-medium ${isRead ? 'bg-neutral-100 text-neutral-700' : 'bg-amber-50 text-amber-700'}`}>
            {isRead ? 'Read' : 'Unread'}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
          {notification.message}
        </div>

        <div className="mt-5 space-y-3 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <Clock3 size={16} className="text-neutral-500" />
            <span>Received: {formatDate(notification.created_at)}</span>
          </div>

          {notification.senderId ? (
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-neutral-500" />
              <span>Source: {notification.senderId}</span>
            </div>
          ) : null}

          {relatedText ? (
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-neutral-500" />
              <span>{relatedText}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onKeep}>
            Keep Message
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => void handleDelete()}
            disabled={busy || deleting}
          >
            {busy || deleting ? 'Deleting…' : 'Delete Message'}
          </button>
        </div>
      </section>
    </div>
  );
}
