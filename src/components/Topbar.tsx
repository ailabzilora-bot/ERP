import React from 'react';
import { Calendar, Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function Topbar() {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="h-16 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-slate-400">
        <Calendar className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-medium">{today}</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-500 rounded-full"></span>
        </button>
      </div>
    </div>
  );
}
