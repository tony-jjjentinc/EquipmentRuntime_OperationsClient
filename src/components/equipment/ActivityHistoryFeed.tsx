import React, { useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';

export const ActivityHistoryFeed: React.FC = () => {
  const { historyLogs } = useEquipmentStore();
  const { user } = useAuthStore();
  const {
    historyFilterAction,
    setHistoryFilterAction,
    historySystemFilter,
    setHistorySystemFilter,
    historyMyActionsOnly,
    setHistoryMyActionsOnly,
    openImagePreview
  } = useUIStore();

  const userEmail = user?.email || '';

  // Calculate Action Counts
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: historyLogs.length };
    historyLogs.forEach(log => {
      const act = log.action === 'Shutdown' && log.type === 'Downtime' ? 'Report Downtime' : log.action;
      counts[act] = (counts[act] || 0) + 1;
    });
    return counts;
  }, [historyLogs]);

  // Extract unique systems
  const uniqueSystems = useMemo(() => {
    return Array.from(new Set(historyLogs.map(l => l.raw?.["System"]).filter(Boolean))) as string[];
  }, [historyLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      // 1. Action Filter
      const normalizedAction = log.action === 'Shutdown' && log.type === 'Downtime' ? 'Report Downtime' : log.action;
      if (historyFilterAction !== 'All' && normalizedAction !== historyFilterAction) {
        return false;
      }

      // 2. System Filter
      if (historySystemFilter !== 'All' && log.raw?.["System"] !== historySystemFilter) {
        return false;
      }

      // 3. My Actions Only
      if (historyMyActionsOnly && userEmail) {
        const reportedBy = (log.reportedBy || '').toLowerCase();
        if (!reportedBy.includes(userEmail.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [historyLogs, historyFilterAction, historySystemFilter, historyMyActionsOnly, userEmail]);

  return (
    <div className="mb-4">
      {/* Tier 2: Action Type Filter Pills */}
      <div className="d-flex overflow-auto no-scrollbar gap-2 mb-2 pb-1" style={{ whiteSpace: 'nowrap' }}>
        {['All', 'Startup', 'Shutdown', 'Report Downtime', 'Restart'].map(act => {
          const isActive = historyFilterAction === act;
          const count = actionCounts[act] || 0;
          return (
            <button
              key={act}
              type="button"
              className={`btn btn-sm d-inline-flex align-items-center rounded-pill px-3 shadow-sm ${
                isActive ? 'btn-primary text-white fw-bold' : 'btn-light border text-secondary'
              }`}
              onClick={() => setHistoryFilterAction(act)}
              style={{ fontSize: '0.75rem' }}
            >
              <span>{act}</span>
              <span
                className={`badge rounded-pill ms-1 ${
                  isActive ? 'bg-white bg-opacity-25 text-white' : 'bg-secondary bg-opacity-10 text-secondary'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tier 3: System Filter Pills & My Actions Toggle */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex gap-2 overflow-auto no-scrollbar py-1" style={{ whiteSpace: 'nowrap' }}>
          <button
            type="button"
            className={`btn btn-sm d-inline-flex align-items-center rounded-pill px-3 shadow-sm ${
              historySystemFilter === 'All' ? 'btn-primary text-white fw-bold' : 'btn-light border text-secondary'
            }`}
            onClick={() => setHistorySystemFilter('All')}
            style={{ fontSize: '0.75rem' }}
          >
            <span>All Systems</span>
          </button>
          {uniqueSystems.map(sys => (
            <button
              key={sys}
              type="button"
              className={`btn btn-sm d-inline-flex align-items-center rounded-pill px-3 shadow-sm ${
                historySystemFilter === sys ? 'btn-primary text-white fw-bold' : 'btn-light border text-secondary'
              }`}
              onClick={() => setHistorySystemFilter(sys)}
              style={{ fontSize: '0.75rem' }}
            >
              <span>{sys}</span>
            </button>
          ))}
        </div>

        {/* My Actions Toggle */}
        <div className="form-check form-switch m-0 d-flex align-items-center gap-1 ms-auto">
          <input
            className="form-check-input shadow-none cursor-pointer"
            type="checkbox"
            id="myActionsToggle"
            checked={historyMyActionsOnly}
            onChange={e => setHistoryMyActionsOnly(e.target.checked)}
          />
          <label className="form-check-label extra-small fw-semibold text-dark cursor-pointer text-nowrap" htmlFor="myActionsToggle">
            My Actions Only
          </label>
        </div>
      </div>

      {/* Feed Cards */}
      {filteredLogs.length === 0 ? (
        <div className="card border-dashed p-5 text-center bg-white rounded-4 shadow-sm my-3">
          <i className="bi bi-clock-history fs-1 text-muted mb-2"></i>
          <h6 className="fw-bold text-dark">No Events Match Filter</h6>
          <p className="text-muted extra-small mb-0">Try clearing filters or changing selection.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {filteredLogs.map((log, index) => {
            const isStartup = log.action === 'Startup';
            const isShutdown = log.action === 'Shutdown';
            const isDowntime = log.action === 'Report Downtime' || (log.action === 'Shutdown' && log.type === 'Downtime');
            const isRestart = log.action === 'Restart';

            let actionBadgeClass = 'bg-secondary text-white';
            if (isStartup) actionBadgeClass = 'bg-success text-white';
            else if (isShutdown) actionBadgeClass = 'bg-dark text-white';
            else if (isDowntime) actionBadgeClass = 'bg-danger text-white';
            else if (isRestart) actionBadgeClass = 'bg-warning text-dark';

            return (
              <div key={index} className="card shadow-sm border rounded-3 p-3 bg-white">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${actionBadgeClass} extra-small px-2 py-1`}>
                      {log.action}
                    </span>
                    <strong className="text-dark small">{log.commonName}</strong>
                    <span className="badge bg-light text-secondary border font-monospace extra-small">
                      {log.tagNumber}
                    </span>
                  </div>
                  <span className="text-muted extra-small">
                    {log.date} · {log.time}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center extra-small text-muted">
                  <div>
                    <span>Reported by: </span>
                    <strong className="text-secondary">{log.reportedBy || 'Unknown'}</strong>
                  </div>
                  {log.imageUrl && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary extra-small py-0 px-2 rounded-pill shadow-none"
                      onClick={() => openImagePreview(log.imageUrl!)}
                    >
                      <i className="bi bi-image me-1"></i> View Photo
                    </button>
                  )}
                </div>

                {log.remarks && (
                  <div className="small text-secondary bg-light rounded p-2 border mt-2">
                    "{log.remarks}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
