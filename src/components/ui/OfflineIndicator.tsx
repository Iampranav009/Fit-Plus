import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [offline, setOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#1C2029]/95 border border-[#FFB86C]/35 text-[#F5F5F7] text-[13px] font-medium shadow-lg backdrop-blur-md flex items-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#FFB86C]" aria-hidden="true" />
      <span>Offline mode — cached data shown; updates sync when reconnected</span>
    </div>
  );
};
