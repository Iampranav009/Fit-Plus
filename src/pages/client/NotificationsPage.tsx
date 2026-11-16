import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';

export const NotificationsPage: React.FC = () => {
  const { store, activeUser, markNotificationRead, markAllNotificationsRead } = useApp();
  const navigate = useNavigate();

  const items = store.notifications.filter((n) => n.recipientUserId === activeUser.id);

  return (
    <AppShell pageTitle="Notifications">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
            Notifications
          </h1>
          {items.some((n) => !n.read) ? (
            <GlassButton variant="secondary" size="sm" onClick={markAllNotificationsRead}>
              Mark all read
            </GlassButton>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-[22px] surface-card p-8 text-center flex flex-col items-center gap-2">
            <Bell className="w-6 h-6 text-[#7C8393]" aria-hidden="true" />
            <p className="text-[16px] font-medium text-[#F5F5F7]">You're all caught up</p>
            <p className="text-[13px] text-[#7C8393]">
              New assignments, consultation updates, and reminders appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-[22px] surface-card divide-y divide-white/[0.08]">
            {items.map((n) => (
              <div
                key={n.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[#F5F5F7]">
                    {n.title}
                    {!n.read ? ' · Unread' : ''}
                  </p>
                  <p className="text-[14px] text-[#A2A8B5]">{n.body}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.actionRoute ? (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        markNotificationRead(n.id);
                        navigate(n.actionRoute!);
                      }}
                    >
                      View
                    </GlassButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
