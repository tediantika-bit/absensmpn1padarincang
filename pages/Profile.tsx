
import React, { useState, useEffect } from 'react';
import { User as UserIcon, LogOut, Settings, Shield, Info, ChevronRight, School, Briefcase, IdCard, BadgeCheck, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

const SPREADSHEET_ID = '1MEV7qhqG4SF9eoWyo2KjfSLDndDAqp-MR4iJV5pbg-0';
const SHEET_NAME = 'Sheet1';

const Profile: React.FC<ProfileProps> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncProfileData = async () => {
    setIsSyncing(true);
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      const jsonData = JSON.parse(text.substring(startIdx, endIdx + 1));
      
      const rows = jsonData.table.rows;
      const foundRow = rows.find((row: any) => 
        row.c[0]?.v?.toString().toLowerCase() === user.username.toLowerCase()
      );

      if (foundRow) {
        const updatedUser = {
          ...user,
          name: foundRow.c[2]?.v?.toString() || user.name,
          nip: foundRow.c[3]?.v?.toString() || user.nip,
          role: foundRow.c[4]?.v?.toString() || user.role,
          employmentStatus: foundRow.c[5]?.v?.toString() || user.employmentStatus,
        };
        setUser(updatedUser);
        // Simpan ke localStorage agar dashboard juga terupdate
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Failed to sync profile:", err);
    } finally {
      // Delay sedikit agar transisi loading terasa smooth
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    syncProfileData();
  }, []);

  const infoItems = [
    { 
      icon: <IdCard size={18} className="text-indigo-400" />, 
      label: 'NIP', 
      value: user.nip 
    },
    { 
      icon: <Briefcase size={18} className="text-amber-400" />, 
      label: 'Jabatan', 
      value: user.role 
    },
    { 
      icon: <BadgeCheck size={18} className="text-emerald-400" />, 
      label: 'Status Pegawai', 
      value: user.employmentStatus 
    },
    { 
      icon: <School size={18} className="text-blue-400" />, 
      label: 'Unit Kerja', 
      value: user.school 
    },
  ];

  const menuItems = [
    { icon: <Shield size={20} />, label: 'Keamanan Akun', color: 'text-slate-400' },
    { icon: <Settings size={20} />, label: 'Pengaturan App', color: 'text-slate-400' },
    { icon: <Info size={20} />, label: 'Tentang Aplikasi', color: 'text-slate-400' },
  ];

  return (
    <div className="flex-1 pb-24 overflow-y-auto">
      <Header title="Profil Saya" />

      <div className="flex flex-col items-center pt-8 pb-6 px-6 relative">
        {isSyncing && (
          <div className="absolute top-4 right-6 flex items-center gap-2 text-[9px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
            <RefreshCw size={10} className="animate-spin" />
            Sinkronisasi...
          </div>
        )}

        <div className="relative">
          <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/20">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-full h-full rounded-full object-cover border-4 border-slate-950"
            />
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 bg-indigo-600 rounded-full border-2 border-slate-950 flex items-center justify-center text-white shadow-lg">
            <UserIcon size={14} />
          </div>
        </div>
        
        <h2 className={`mt-5 text-xl font-bold text-white text-center leading-tight transition-opacity ${isSyncing ? 'opacity-50' : 'opacity-100'}`}>
          {user.name}
        </h2>
        
        <div className={`mt-2 flex flex-col items-center gap-2 transition-opacity ${isSyncing ? 'opacity-50' : 'opacity-100'}`}>
           <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{user.role}</span>
           <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
             {user.employmentStatus}
           </span>
        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-5 shadow-inner">
          <h3 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-4 px-2">Data Kepegawaian</h3>
          <div className="space-y-4">
            {infoItems.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-4 p-1 transition-opacity ${isSyncing ? 'opacity-40' : 'opacity-100'}`}>
                <div className="mt-0.5 p-2 bg-slate-800 rounded-xl">
                  {item.icon}
                </div>
                <div className="flex-1 border-b border-white/5 pb-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block mb-0.5">{item.label}</span>
                  <span className="text-sm text-slate-200 font-semibold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 space-y-2">
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            className="w-full flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 bg-slate-800 rounded-lg ${item.color}`}>
                {item.icon}
              </div>
              <span className="text-slate-300 font-medium text-sm">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </button>
        ))}

        <div className="pt-6">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-600/10 border border-red-600/20 text-red-500 font-bold rounded-2xl hover:bg-red-600/20 transition-all"
          >
            <LogOut size={20} />
            Keluar dari Aplikasi
          </button>
        </div>
      </div>

      <div className="mt-12 text-center text-slate-600 text-[9px] uppercase tracking-widest pb-8">
        Sistem Informasi Kepegawaian v2.2.0<br/>SMPN 1 Padarincang
      </div>
    </div>
  );
};

export default Profile;
