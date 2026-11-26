import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate } from '../../lib/date';

export const AdminAuditPage: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Audit Log</h1>
        <p className="mt-1 text-[13px] text-[#A2A8B5]">Security and compliance event trail.</p>
      </div>

      <section className="surface-card rounded-[24px] p-5 sm:p-6">
        {auditLogs.length === 0 ? (
          <p className="text-[13px] text-[#A2A8B5]">
            Audit events appear here when server-side admin actions occur.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.08]">
            {auditLogs.slice(0, 50).map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap justify-between gap-2 text-[13px]">
                <div>
                  <span className="font-medium text-[#F5F5F7]">{log.action}</span>
                  <span className="text-[#A2A8B5]"> · {log.summary}</span>
                </div>
                <span className="text-[#7C8393] tabular-nums">
                  {log.targetType}/{log.targetId} · {formatIndiaDate(log.createdAt.slice(0, 10), 'short')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
