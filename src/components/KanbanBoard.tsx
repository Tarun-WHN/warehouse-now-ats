'use client';

import { useState } from 'react';
import { Candidate, CandidateStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { TimeInStageBadge } from '@/components/TimeInStageBadge';
import { MapPin, Briefcase, GripVertical } from 'lucide-react';

const COLUMNS: { status: CandidateStatus; color: string; headerBg: string }[] = [
  { status: 'New', color: 'border-blue-400', headerBg: 'bg-blue-50' },
  { status: 'Contacted', color: 'border-orange-400', headerBg: 'bg-orange-50' },
  { status: 'Screening', color: 'border-cyan-400', headerBg: 'bg-cyan-50' },
  { status: 'Interviewing', color: 'border-emerald-400', headerBg: 'bg-emerald-50' },
  { status: 'Offered', color: 'border-purple-400', headerBg: 'bg-purple-50' },
  { status: 'Hired', color: 'border-green-400', headerBg: 'bg-green-50' },
  { status: 'Rejected', color: 'border-red-400', headerBg: 'bg-red-50' },
  { status: 'On Hold', color: 'border-gray-400', headerBg: 'bg-gray-50' },
];

interface KanbanBoardProps {
  candidates: Candidate[];
  onStatusChange: (id: string, status: CandidateStatus) => void;
  onCandidateClick: (id: string) => void;
}

export function KanbanBoard({ candidates, onStatusChange, onCandidateClick }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<CandidateStatus | null>(null);

  const grouped: Record<CandidateStatus, Candidate[]> = {
    New: [], Contacted: [], Screening: [], Interviewing: [],
    Offered: [], Hired: [], Rejected: [], 'On Hold': [],
  };

  candidates.forEach(c => {
    if (grouped[c.status]) {
      grouped[c.status].push(c);
    }
  });

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('text/plain', candidateId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(candidateId);
  };

  const handleDragOver = (e: React.DragEvent, status: CandidateStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, status: CandidateStatus) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('text/plain');
    if (candidateId) {
      onStatusChange(candidateId, status);
    }
    setDraggedId(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStatus(null);
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max px-1">
        {COLUMNS.map(({ status, color, headerBg }) => {
          const items = grouped[status];
          const isOver = dragOverStatus === status;

          return (
            <div
              key={status}
              className={`flex flex-col w-72 min-h-[500px] rounded-xl border-2 ${color} bg-gray-50/50 transition-colors ${
                isOver ? 'bg-gold/10 border-gold' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${headerBg}`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-navy">{status}</h3>
                </div>
                <span className="text-xs font-semibold bg-white text-navy rounded-full px-2 py-0.5 shadow-sm">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {items.map(candidate => (
                  <div
                    key={candidate.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onCandidateClick(candidate.id)}
                    className={`bg-white rounded-lg shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                      draggedId === candidate.id ? 'opacity-40 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-navy truncate">
                          {candidate.full_name}
                        </p>
                        {candidate.current_designation && (
                          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1 truncate">
                            <Briefcase size={10} className="shrink-0" />
                            {candidate.current_designation}
                          </p>
                        )}
                      </div>
                      <GripVertical size={14} className="text-gray-300 shrink-0 mt-0.5" />
                    </div>

                    {candidate.current_employer && (
                      <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {candidate.current_employer}
                      </p>
                    )}

                    {candidate.current_location && (
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                        <MapPin size={9} className="shrink-0" />
                        {candidate.current_location}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      {candidate.source && (
                        <span className="text-[10px] font-medium bg-navy/5 text-navy/70 px-1.5 py-0.5 rounded">
                          {candidate.source}
                        </span>
                      )}
                      <TimeInStageBadge
                        statusChangedAt={candidate.status_changed_at}
                        dateAdded={candidate.date_added}
                      />
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    Drop candidates here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
