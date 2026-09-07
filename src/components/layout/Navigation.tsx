import React from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';

export const Navigation: React.FC = () => {
  const { equipment } = useEquipmentStore();
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    systemFilter,
    setSystemFilter
  } = useUIStore();

  // Extract unique systems and counts
  const uniqueSystems = Array.from(new Set(equipment.map(e => e["System"]).filter(Boolean))) as string[];
  const systemCounts: Record<string, number> = { All: equipment.length };
  uniqueSystems.forEach(sys => {
    systemCounts[sys] = equipment.filter(e => e["System"] === sys).length;
  });

  return (
    <div className="mb-3">
      {/* Search and Tabs Row */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        {/* Navigation Tabs */}
        <div className="btn-group btn-group-sm shadow-sm" role="group">
          <button
            type="button"
            className={`btn ${activeTab === 'equipment' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setActiveTab('equipment')}
          >
            <i className="bi bi-grid-fill me-1"></i> Equipment ({equipment.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="bi bi-clock-history me-1"></i> Activity History
          </button>
        </div>

        {/* Search Input */}
        {activeTab === 'equipment' && (
          <div className="input-group input-group-sm shadow-sm" style={{ maxWidth: '260px' }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 shadow-none"
              placeholder="Search tag, name, room..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn btn-outline-secondary border-start-0 bg-white"
                type="button"
                onClick={() => setSearchQuery('')}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {/* System Filter Pills Slider (Horizontal Scrollable) */}
      {activeTab === 'equipment' && uniqueSystems.length > 0 && (
        <div className="d-flex gap-2 overflow-auto no-scrollbar py-1" style={{ whiteSpace: 'nowrap' }}>
          <button
            type="button"
            className={`btn btn-sm d-inline-flex align-items-center rounded-pill px-3 shadow-sm ${
              systemFilter === '' ? 'btn-primary text-white fw-bold' : 'btn-light border text-secondary'
            }`}
            onClick={() => setSystemFilter('')}
            style={{ fontSize: '0.75rem' }}
          >
            <span>All Systems</span>
            <span
              className={`badge rounded-pill ms-1 ${
                systemFilter === '' ? 'bg-white bg-opacity-25 text-white' : 'bg-secondary bg-opacity-10 text-secondary'
              }`}
            >
              {systemCounts['All'] || 0}
            </span>
          </button>

          {uniqueSystems.map(sys => {
            const isSelected = systemFilter === sys;
            return (
              <button
                key={sys}
                type="button"
                className={`btn btn-sm d-inline-flex align-items-center rounded-pill px-3 shadow-sm ${
                  isSelected ? 'btn-primary text-white fw-bold' : 'btn-light border text-secondary'
                }`}
                onClick={() => setSystemFilter(isSelected ? '' : sys)}
                style={{ fontSize: '0.75rem' }}
              >
                <span>{sys}</span>
                <span
                  className={`badge rounded-pill ms-1 ${
                    isSelected ? 'bg-white bg-opacity-25 text-white' : 'bg-secondary bg-opacity-10 text-secondary'
                  }`}
                >
                  {systemCounts[sys] || 0}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
