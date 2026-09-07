import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';

export const StateTimeline: React.FC = () => {
  const { selectedEquipment, showTimelineModal, closeTimelineModal, openImagePreview } = useUIStore();
  const { historyLogs } = useEquipmentStore();

  if (!showTimelineModal || !selectedEquipment) return null;

  const tag = selectedEquipment["Tagging Number"] || selectedEquipment["Equipment ID"] || "";
  const commonName = selectedEquipment["Common Name"] || tag;

  const equipmentLogs = historyLogs.filter(
    l => l.tagNumber === tag || l.raw?.["Tagging Number"] === tag || l.raw?.["Equipment ID"] === tag
  );

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '500px' }}>
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header border-bottom px-4 py-3">
            <div>
              <h5 className="modal-title fw-bold text-dark mb-0">Runtime History</h5>
              <div className="extra-small text-muted">
                {commonName} (<span className="font-monospace text-secondary">{tag}</span>)
              </div>
            </div>
            <button type="button" className="btn-close shadow-none" onClick={closeTimelineModal}></button>
          </div>

          <div className="modal-body px-4 py-3">
            {equipmentLogs.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-clock-history fs-2 d-block mb-2 text-secondary"></i>
                <p className="small mb-0">No recorded actions in the last 7 days.</p>
              </div>
            ) : (
              <div className="position-relative ps-3 border-start border-2 border-primary border-opacity-25 ms-2">
                {equipmentLogs.map((log, index) => {
                  const isStartup = log.action === 'Startup';
                  const isShutdown = log.action === 'Shutdown';
                  const isDowntime = log.action === 'Report Downtime' || log.action === 'Shutdown' && log.type === 'Downtime';
                  const isRestart = log.action === 'Restart';

                  let badgeBg = 'bg-secondary text-white';
                  let icon = 'bi-record-circle';

                  if (isStartup) {
                    badgeBg = 'bg-success text-white';
                    icon = 'bi-play-fill';
                  } else if (isRestart) {
                    badgeBg = 'bg-warning text-dark';
                    icon = 'bi-arrow-clockwise';
                  } else if (isDowntime) {
                    badgeBg = 'bg-danger text-white';
                    icon = 'bi-exclamation-triangle-fill';
                  } else if (isShutdown) {
                    badgeBg = 'bg-dark text-white';
                    icon = 'bi-power';
                  }

                  return (
                    <div key={index} className="mb-4 position-relative">
                      {/* Timeline Node Dot */}
                      <span
                        className={`position-absolute top-0 start-0 translate-middle rounded-circle d-flex align-items-center justify-content-center shadow-sm ${badgeBg}`}
                        style={{ width: '22px', height: '22px', left: '-13px' }}
                      >
                        <i className={`bi ${icon}`} style={{ fontSize: '0.65rem' }}></i>
                      </span>

                      {/* Card Content */}
                      <div className="bg-light rounded-3 p-3 ms-2 border">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className={`badge ${badgeBg} extra-small px-2 py-1`}>
                            {log.action}
                          </span>
                          <span className="text-muted extra-small">
                            {log.date} · {log.time}
                          </span>
                        </div>

                        <div className="extra-small text-muted mb-1">
                          Reported by: <strong className="text-dark">{log.reportedBy || 'Unknown'}</strong>
                        </div>

                        {log.remarks && (
                          <div className="small text-secondary bg-white rounded p-2 border mb-2">
                            "{log.remarks}"
                          </div>
                        )}

                        {log.imageUrl && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 extra-small rounded-pill py-1 px-2"
                            onClick={() => openImagePreview(log.imageUrl!)}
                          >
                            <i className="bi bi-image"></i>
                            <span>View Attachment</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer border-top-0 pt-0 pb-3 px-4">
            <button type="button" className="btn btn-light rounded-pill w-100 fw-semibold" onClick={closeTimelineModal}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
