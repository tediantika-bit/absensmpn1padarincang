import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogIn, LogOut, Coffee, GraduationCap, MapPin, Clock, Camera, Check, X, RefreshCw, Fingerprint, FileText, Calendar as CalendarIcon, Image as ImageIcon, AlertCircle, ShieldCheck, Navigation, CloudUpload, Upload, BookOpen } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface HomeProps { user: User; }

const SCHOOL_LAT = -6.207717532534012;
const SCHOOL_LNG = 105.97297020119038;
const ALLOWED_RADIUS_METERS = 50000; // Radius 50.000 meter (50 km)

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwrtXYgYZHvrca9VCZJZz09jHsrzhVCB_CzhLPQell08AhSftIeDbPd2JjoMzVWxJiK/exec';

const Home: React.FC<HomeProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'IDLE' | 'PRESENT' | 'OUT'>('IDLE');
  const [showTeachingModal, setShowTeachingModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teaching States
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:00');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [selectedClassroom, setSelectedClassroom] = useState('VII-A');
  
  // Leave States
  const [leaveType, setLeaveType] = useState<'Izin' | 'Sakit' | 'Dinas'>('Izin');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceType, setAttendanceType] = useState<'IN' | 'OUT' | 'TEACHING' | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAfterPulangTime = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours > 14 || (hours === 14 && minutes >= 20);
  }, [currentTime]);

  const isPulangDisabled = status !== 'PRESENT' || !isAfterPulangTime;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getLocation = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          const d = calculateDistance(coords.lat, coords.lng, SCHOOL_LAT, SCHOOL_LNG);
          setDistance(d);
          setGpsLoading(false);
        },
        () => { 
          setGpsLoading(false); 
          setErrors(prev => ({...prev, location: "GPS Gagal"})); 
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setIsCameraActive(false);
      setErrors(prev => ({...prev, photo: "Kamera Error"}));
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const targetWidth = 400;
      const scaleFactor = targetWidth / video.videoWidth;
      const targetHeight = video.videoHeight * scaleFactor;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const sendDataToGAS = async (payload: any) => {
    setIsSubmitting(true);
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (err) {
      console.error("GAS Submit Error:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!photo) { setErrors({ photo: "Foto wajib" }); return; }
    if (distance !== null && distance > ALLOWED_RADIUS_METERS) {
        alert(`Jarak Anda ${Math.round(distance)}m. Batas percobaan adalah ${ALLOWED_RADIUS_METERS}m.`);
        return;
    }
    
    const typeLabel = attendanceType === 'IN' ? 'MASUK' : 'PULANG';
    const payload = { 
      category: 'attendance',
      name: user.name, 
      nip: user.nip, 
      type: typeLabel, 
      time: formatTime(new Date()), 
      date: formatDate(new Date()),
      location: location ? `${location.lat},${location.lng}` : "Tanpa Koordinat", 
      photo: photo 
    };

    const success = await sendDataToGAS(payload);
    if (success) {
      setStatus(attendanceType === 'IN' ? 'PRESENT' : 'OUT');
      alert(`Berhasil! Data Absen ${typeLabel} telah dikirim ke sistem.`);
      setShowAttendanceModal(false);
      setPhoto(null);
    } else {
      alert("Terjadi gangguan jaringan. Coba lagi.");
    }
  };

  const handleSubmitTeaching = async () => {
    if (!photo) { setErrors({ photo: "Ambil foto bukti" }); return; }
    
    const payload = { 
      category: 'teaching',
      name: user.name, 
      nip: user.nip, 
      date: formatDate(new Date()),
      startTime: startTime, 
      endTime: endTime,
      classroom: selectedClassroom, 
      subject: selectedSubject, 
      photo 
    };

    const success = await sendDataToGAS(payload);
    if (success) {
      alert(`Laporan Mengajar Berhasil Terkirim!`);
      setShowTeachingModal(false);
      setPhoto(null);
    } else {
      alert("Gagal mengirim laporan.");
    }
  };

  const handleSubmitLeave = async () => {
    if (!leaveStartDate || !leaveReason) { alert("Isi data dengan lengkap"); return; }
    const payload = { 
      category: 'leave',
      name: user.name, nip: user.nip, submitDate: formatDate(new Date()),
      leaveType, startDate: leaveStartDate, endDate: leaveEndDate, reason: leaveReason, 
      photo: 'Tanpa Lampiran' 
    };

    const success = await sendDataToGAS(payload);
    if (success) {
      alert(`Pengajuan Izin Berhasil Dikirim`);
      setShowLeaveModal(false);
    } else {
      alert("Gagal mengirim pengajuan.");
    }
  };

  return (
    <div className="flex-1 pb-24 overflow-y-auto">
      <Header title="E-Presensi" />
      
      <div className="px-6 mb-6">
        <div className="p-6 rounded-2xl glass border-indigo-500/20">
          <h2 className="text-slate-400 text-sm font-medium">Selamat Datang,</h2>
          <p className="text-xl font-bold text-white mt-1 truncate">{user.name}</p>
          <div className="mt-3 flex items-center gap-2">
             <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 font-bold uppercase">{user.role}</span>
             <span className="text-[10px] text-slate-500 font-medium">NIP: {user.nip}</span>
          </div>
        </div>
      </div>

      <div className="px-6 mb-10 text-center">
        <div className="inline-block px-8 py-6 bg-slate-900/40 rounded-3xl border border-white/5 shadow-inner">
            <div className="text-4xl font-mono font-bold tracking-tighter text-indigo-400 mb-1">{formatTime(currentTime)}</div>
            <div className="text-slate-400 text-sm font-medium">{formatDate(currentTime)}</div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-4">
        <button onClick={() => { setAttendanceType('IN'); setShowAttendanceModal(true); setPhoto(null); setErrors({}); getLocation(); startCamera(); }} disabled={status !== 'IDLE'} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 disabled:opacity-30 active:scale-95 transition-all group">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg"><LogIn className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs uppercase tracking-wider">Masuk</span>
        </button>
        <button onClick={() => { setAttendanceType('OUT'); setShowAttendanceModal(true); setPhoto(null); setErrors({}); getLocation(); startCamera(); }} disabled={isPulangDisabled} className="flex flex-col items-center justify-center gap-2 p-5 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 disabled:opacity-30 active:scale-95 transition-all group">
            <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg"><LogOut className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs uppercase tracking-wider">Pulang</span>
        </button>
        <button onClick={() => { setShowTeachingModal(true); setPhoto(null); startCamera(); }} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-amber-600/10 border border-amber-500/20 active:scale-95 transition-all group">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-lg"><GraduationCap className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs uppercase tracking-wider">Mengajar</span>
        </button>
        <button onClick={() => setShowLeaveModal(true)} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-blue-600/10 border border-blue-500/20 active:scale-95 transition-all group">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg"><Coffee className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs uppercase tracking-wider">Izin</span>
        </button>
      </div>

      {/* Modal Absensi */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md bg-slate-950/80">
          <div className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Absensi {attendanceType === 'IN' ? 'Masuk' : 'Pulang'}</h3>
              <button disabled={isSubmitting} onClick={() => { setShowAttendanceModal(false); stopCamera(); }} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              {/* Info Identitas Guru */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block leading-none mb-1">Identitas Guru</span>
                  <span className="text-xs text-white font-bold block">{user.name}</span>
                  <span className="text-[9px] text-slate-400 block">{user.nip}</span>
                </div>
              </div>

              {/* Info Lokasi */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${distance !== null && distance <= ALLOWED_RADIUS_METERS ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    <Navigation size={18} className={gpsLoading ? 'animate-spin' : ''} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block leading-none mb-1">Status Lokasi</span>
                  <span className="text-xs text-white font-medium block">
                    {gpsLoading ? 'Melacak Sinyal GPS...' : distance !== null ? `${Math.round(distance)} meter dari sekolah` : 'GPS Belum Aktif'}
                  </span>
                  <span className="text-[9px] text-indigo-400 font-bold block mt-1">Percobaan Radius: {ALLOWED_RADIUS_METERS.toLocaleString('id-ID')}m</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className={`relative aspect-[3/4] w-full max-w-[260px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all ${errors.photo ? 'border-red-500 animate-shake' : 'border-indigo-500/30'}`}>
                  {photo ? (
                    <img src={photo} className="w-full h-full object-cover" alt="Selfie" />
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  )}
                  {!photo && isCameraActive && (
                    <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-slate-900 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                      <Camera size={28} className="text-slate-900" />
                    </button>
                  )}
                  {photo && (
                    <button onClick={() => { setPhoto(null); startCamera(); }} className="absolute bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-500 transition-all">
                      <RefreshCw size={24}/>
                    </button>
                  )}
                </div>
                {errors.photo && <p className="text-red-500 text-[10px] mt-2 font-black uppercase tracking-widest">{errors.photo}</p>}
              </div>

              <button 
                onClick={handleSubmitAttendance} 
                disabled={isSubmitting || gpsLoading} 
                className={`w-full py-5 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2 ${isSubmitting || gpsLoading ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'}`}
              >
                {isSubmitting ? <CloudUpload className="animate-bounce" size={24} /> : <Check size={24} />}
                {isSubmitting ? 'MENGIRIM...' : 'KONFIRMASI SEKARANG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mengajar */}
      {showTeachingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md bg-slate-950/80">
          <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] p-6 border border-white/10 overflow-y-auto max-h-[90vh] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><GraduationCap size={20} className="text-amber-500" /> Laporan Mengajar</h3>
                <button disabled={isSubmitting} onClick={() => { setShowTeachingModal(false); stopCamera(); }} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
                {/* Info Nama */}
                <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">Nama Guru</span>
                    <input type="text" value={user.name} readOnly className="w-full bg-transparent text-white text-sm outline-none font-bold opacity-70" />
                </div>

                {/* Info NIP */}
                <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">NIP</span>
                    <input type="text" value={user.nip} readOnly className="w-full bg-transparent text-white text-sm outline-none font-bold opacity-70" />
                </div>

                {/* Grid Jam Mulai & Selesai */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">Jam Mulai</span>
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none font-bold" />
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">Jam Selesai</span>
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none font-bold" />
                    </div>
                </div>

                {/* Grid Ruang & Mapel */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">Ruang Kelas</span>
                        <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none font-bold">
                            <option className="bg-slate-900">VII-A</option><option className="bg-slate-900">VII-B</option>
                            <option className="bg-slate-900">VIII-A</option><option className="bg-slate-900">VIII-B</option>
                            <option className="bg-slate-900">IX-A</option><option className="bg-slate-900">IX-B</option>
                        </select>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-tight">Mata Pelajaran</span>
                        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none font-bold">
                            <option className="bg-slate-900">Matematika</option><option className="bg-slate-900">IPA</option>
                            <option className="bg-slate-900">IPS</option><option className="bg-slate-900">B. Indonesia</option>
                            <option className="bg-slate-900">PJOK</option>
                        </select>
                    </div>
                </div>

                <div className="text-center">
                  <div className={`relative aspect-[3/4] w-full max-w-[240px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-xl border-amber-500/30`}>
                      {photo ? <img src={photo} className="w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
                      {!photo && <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg"><Camera size={24} className="text-slate-900" /></button>}
                      {photo && <button onClick={() => { setPhoto(null); startCamera(); }} className="absolute bottom-6 right-6 p-3 bg-amber-500 text-slate-900 rounded-full shadow-lg"><RefreshCw size={20}/></button>}
                  </div>
                </div>

                <button onClick={handleSubmitTeaching} disabled={isSubmitting} className={`w-full py-5 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-slate-700 opacity-50' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-lg'}`}>
                    {isSubmitting ? <CloudUpload className="animate-bounce" size={24} /> : <Check size={24} />}
                    {isSubmitting ? 'MENGIRIM...' : 'KIRIM LAPORAN'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Izin */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md bg-slate-950/80">
            <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Pengajuan Izin</h3>
                    <button disabled={isSubmitting} onClick={() => setShowLeaveModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex bg-slate-800 p-1 rounded-xl">
                        {(['Izin', 'Sakit', 'Dinas'] as const).map(t => (
                            <button key={t} onClick={() => setLeaveType(t)} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${leaveType === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{t}</button>
                        ))}
                    </div>
                    <textarea 
                      value={leaveReason} 
                      onChange={e => setLeaveReason(e.target.value)} 
                      placeholder="Alasan detail..." 
                      className="w-full p-4 bg-slate-800 border border-white/5 rounded-xl text-white text-sm h-32 outline-none focus:ring-1 focus:ring-indigo-500/50" 
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">Mulai</span>
                        <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl text-white text-xs outline-none" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">Selesai</span>
                        <input type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl text-white text-xs outline-none" />
                      </div>
                    </div>
                    <button onClick={handleSubmitLeave} disabled={isSubmitting} className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-slate-700 opacity-50' : 'bg-indigo-600 text-white shadow-lg'}`}>
                        {isSubmitting ? <CloudUpload className="animate-bounce" size={20} /> : <Check size={20} />}
                        KIRIM PENGAJUAN
                    </button>
                </div>
            </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Home;