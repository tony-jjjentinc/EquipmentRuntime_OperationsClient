import React, { useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { EquipmentCard } from './EquipmentCard';

export const EquipmentGrid: React.FC = () => {
  const { equipment, isLoading } = useEquipmentStore();
  const { searchQuery, systemFilter } = useUIStore();

  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
      // 1. System Filter
      if (systemFilter && eq["System"] !== systemFilter) return false;

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const tag = (eq["Tagging Number"] || eq["Equipment ID"] || '').toLowerCase();
        const name = (eq["Common Name"] || '').toLowerCase();
        const loc = (eq["Location"] || '').toLowerCase();
        const comp = (eq["Component"] || '').toLowerCase();
        if (!tag.includes(q) && !name.includes(q) && !loc.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [equipment, systemFilter, searchQuery]);

  if (isLoading && equipment.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
          <span className="visually-hidden">Loading equipment...</span>
        </div>
        <p className="text-muted small">Loading equipment directory...</p>
      </div>
    );
  }

  if (filteredEquipment.length === 0) {
    return (
      <div className="card border-dashed p-5 text-center bg-white rounded-4 shadow-sm my-4">
        <i className="bi bi-inbox fs-1 text-muted mb-2"></i>
        <h6 className="fw-bold text-dark">No Equipment Found</h6>
        <p className="text-muted extra-small mb-0">
          No equipment matches your current search criteria or system filter.
        </p>
      </div>
    );
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3 mb-4">
      {filteredEquipment.map(eq => {
        const key = eq["Tagging Number"] || eq["Equipment ID"] || Math.random().toString();
        return (
          <div key={key} className="col">
            <EquipmentCard equipment={eq} />
          </div>
        );
      })}
    </div>
  );
};
