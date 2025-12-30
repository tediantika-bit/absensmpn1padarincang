
import React, { useState } from 'react';
import { Clock, GraduationCap, Coffee, Calendar, MapPin, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface HistoryProps { user: User; }

const History: React.FC<HistoryProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'teaching' | 'leave'>('attendance');

  // Dummy data untuk visualisasi pemisahan
  const attendanceLogs = [
    { type: 'MASUK', time: '07:15:22', date: 'Senin, 24 Mei 2024', loc: 'Di Sekolah' },
    { type: 'PULANG', time: '14:30:05', date: 'Senin, 24 Mei 2024', loc: 'Di Sekolah' },
  ];

  const teachingLogs = [
    { subject: 'Matematika', class: 'VII-A', time: '08:00 - 09:30', date: 'Senin, 24 Mei 2024' },
  ];

  const leaveLogs = [
    { type: 'Sakit', reason: 'Demam tinggi', status: 'Disetujui', date: '15 Mei 2024' },
  ];

  return (
    <div className="flex-1 pb-24 overflow-y-auto">
      <Header title="Riwayat Saya" />

      {/* Tab Switcher */}
      <div className="px-6 mb-6">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Clock size={18} />
            <span className="text-[10px] font-bold mt-1 uppercase">Presensi</span>
          </button>
          <button 
            onClick={() => setActiveTab('teaching')}
            className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${activeTab === 'teaching' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <GraduationCap size={18} />
            <span className="text-[10px] font-bold mt-1 uppercase">Mengajar</span>
          </button>
          <button 
            onClick={() => setActiveTab('leave')}
            className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${activeTab === 'leave' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Coffee size={18} />
            <span className="text-[10px] font-bold mt-1 uppercase">Izin</span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {activeTab === 'attendance' && attendanceLogs.map((log, i) => (
          <div key={i} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${log.type === 'MASUK' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                {log.type === 'MASUK' ? <Clock size={20} /> : <Calendar size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{log.type}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <span>{log.date}</span>
                  <span>•</span>
                  <span>{log.time}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1">
                <MapPin size={8} /> {log.loc}
              </span>
            </div>
          </div>
        ))}

        {activeTab === 'teaching' && teachingLogs.map((log, i) => (
          <div key={i} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <GraduationCap size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{log.subject}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <span className="text-amber-500 font-bold">{log.class}</span>
                  <span>•</span>
                  <span>{log.time}</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium text-right leading-tight">
              {log.date}
            </div>
          </div>
        ))}

        {activeTab === 'leave' && leaveLogs.map((log, i) => (
          <div key={i} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Coffee size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Izin {log.type}</h4>
                <p className="text-[10px] text-slate-500 italic">"{log.reason}"</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-500 font-bold block mb-1">{log.status}</span>
              <span className="text-[9px] text-slate-500 font-medium">{log.date}</span>
            </div>
          </div>
        ))}

        {(activeTab === 'attendance' && attendanceLogs.length === 0) || 
         (activeTab === 'teaching' && teachingLogs.length === 0) || 
         (activeTab === 'leave' && leaveLogs.length === 0) ? (
          <div className="py-12 text-center text-slate-600">
            <Calendar size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-xs font-medium">Belum ada data untuk kategori ini</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default History;
