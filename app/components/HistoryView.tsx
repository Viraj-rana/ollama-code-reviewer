import React from 'react';
import { HistoryEntry, ReviewStatus } from '../types';
import { 
  CheckCircleIcon, 
  XCircleIcon
} from './Icons';
//calender icon for history
const HistoryCalendarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);

const UserProfileIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const TrashBinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

interface HistoryViewProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onDelete, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <HistoryCalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No review history yet.</h3>
        <p className="text-sm text-slate-500">Completed reviews will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <HistoryCalendarIcon className="w-5 h-5 text-blue-600" /> Review Archive
        </h2>
        <button 
          onClick={onClear}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
        >
          <TrashBinIcon className="w-3.5 h-3.5" /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((entry) => (
          <div 
            key={entry.id}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2">
                  {entry.status === ReviewStatus.APPROVE ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${entry.status === ReviewStatus.APPROVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-auto">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">{entry.projectName}</h3>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5">
                    <UserProfileIcon className="w-3.5 h-3.5" />
                    <span className="font-medium">{entry.author}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic mb-4">"{entry.summary}"</p>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onSelect(entry)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    View Report
                  </button>
                  <button 
                    onClick={() => onDelete(entry.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
