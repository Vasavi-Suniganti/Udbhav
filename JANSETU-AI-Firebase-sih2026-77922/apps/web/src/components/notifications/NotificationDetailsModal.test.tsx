import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { notificationFromApi } from '@/lib/adapters';
import { NotificationDetailsModal } from './NotificationDetailsModal';

describe('NotificationDetailsModal', () => {
  it('normalizes read state when either read or isRead is marked as true', () => {
    const item = notificationFromApi({
      id: 'n-1',
      user_id: 'user-1',
      title: 'Status update',
      message: 'Unread marker should clear once the item is read.',
      type: 'SYSTEM',
      read: false,
      isRead: true,
      created_at: '2026-01-01T12:00:00.000Z',
    });

    expect(item.read).toBe(true);
    expect(item.isRead).toBe(true);
  });

  it('keeps the notification in context and exposes modal actions without automatic navigation', async () => {
    const onKeep = vi.fn();
    const onDelete = vi.fn(async () => {});
    const onMarkRead = vi.fn();

    render(
      <NotificationDetailsModal
        notification={{
          id: 'n-1',
          user_id: 'user-1',
          title: 'Problem verified by Government',
          message: 'Your submitted community problem has been verified and is moving into the Government assignment workflow.',
          type: 'PROBLEM_VERIFIED',
          read: false,
          link: '/dashboard/problems/problem-1',
          created_at: '2026-01-01T12:00:00.000Z',
        }}
        onClose={vi.fn()}
        onKeep={onKeep}
        onDelete={onDelete}
        onMarkRead={onMarkRead}
      />
    );

    expect(screen.getByText('Problem verified by Government')).toBeTruthy();
    expect(screen.getByText(/read/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /keep message/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /delete message/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /keep message/i }));
    expect(onKeep).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /delete message/i }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-1' }));
    expect(onMarkRead).toHaveBeenCalledWith('n-1');
  });
});
