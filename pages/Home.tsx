
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogIn, LogOut, Coffee, GraduationCap, MapPin, Clock, Camera, Check, X, RefreshCw, Fingerprint, FileText, Calendar as CalendarIcon, Image as ImageIcon, AlertCircle, ShieldCheck, Navigation, CloudUpload, Upload } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface HomeProps { user: User; }

const SCHOOL_LAT = -6.207717532534012;
const SCHOOL_LNG = 105.97297020119038;
const ALLOWED_RADIUS_METERS = 100000; // Ditingkatkan ke 100km agar bisa diuji dari mana saja

// URL Script terbaru dari user (v3 dengan integrasi Drive)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzwtHa_LBmJVrUd0DgNysNxmW5kGr_3yljGpvpr6_4egILDQ-LQIQIvKcymnUkfgVLZ/exec';

const Home: React.FC<HomeProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'IDLE' | 'PRESENT' | 'OUT'>('IDLE');
  const [showTeachingModal, setShowTeachingModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teaching Session States
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [selectedClassroom, setSelectedClassroom] = useState('VII-A');

  // Leave States
  const [leaveType, setLeaveType] = useState<'Izin' | 'Sakit' | 'Dinas'>('Izin');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachment, setLeaveAttachment] = useState<string | null>(null);

  // Common States
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceType, setAttendanceType] = useState<'IN' | 'OUT' | 'TEACHING' | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const clearErrors = () => setErrors({});

  const getLocation = () => {
    setGpsLoading(true);
    setErrors(prev => { const n = {...prev}; delete n.location; return n; });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          const dist = calculateDistance(coords.lat, coords.lng, SCHOOL_LAT, SCHOOL_LNG);
          setDistance(dist);
          if (dist > ALLOWED_RADIUS_METERS) {
            setErrors(prev => ({...prev, location: `Terlalu jauh: ${Math.round(dist/1000)}km dari sekolah`}));
          }
          setGpsLoading(false);
        },
        () => { 
          setGpsLoading(false); 
          setErrors(prev => ({...prev, location: "Gagal melacak lokasi. Aktifkan GPS!"})); 
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsLoading(false);
      setErrors(prev => ({...prev, location: "Browser tidak mendukung GPS"}));
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 720 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 3/4 } 
        }, 
        audio: false 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setIsCameraActive(false);
      setErrors(prev => ({...prev, photo: "Kamera tidak aktif"}));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, vWidth, vHeight);
        setPhoto(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLeaveAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenTeaching = () => {
    const now = new Date();
    setStartTime(now.toTimeString().slice(0, 5));
    setEndTime(new Date(now.getTime() + 60*60*1000).toTimeString().slice(0, 5));
    setAttendanceType('TEACHING');
    setPhoto(null);
    clearErrors();
    setShowTeachingModal(true);
    startCamera();
  };

  const openAttendanceModal = (type: 'IN' | 'OUT') => {
    setAttendanceType(type);
    setShowAttendanceModal(true);
    setPhoto(null);
    clearErrors();
    getLocation();
    startCamera();
  };

  const handleSubmitAttendance = async () => {
    const isLocationValid = location && (distance !== null && distance <= ALLOWED_RADIUS_METERS);
    
    if (!photo || !isLocationValid) {
      setErrors({ 
        photo: !photo ? "Foto wajib diambil" : "", 
        location: !location ? "Tunggu GPS melacak..." : (distance! > ALLOWED_RADIUS_METERS ? `Jarak ${Math.round(distance!/1000)}km melampaui batas` : "") 
      });
      return;
    }

    setIsSubmitting(true);
    const typeLabel = attendanceType === 'IN' ? 'MASUK' : 'PULANG';
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: 'attendance',
          name: user.name, 
          nip: user.nip, 
          type: typeLabel, 
          time: formatTime(new Date()), 
          date: formatDate(new Date()),
          location: `${location.lat},${location.lng} (Dist: ${Math.round(distance || 0)}m)`, 
          photo 
        })
      });
      setStatus(attendanceType === 'IN' ? 'PRESENT' : 'OUT');
      alert(`Berhasil Absen ${typeLabel}`);
      setShowAttendanceModal(false);
      stopCamera();
    } catch (err) { 
      alert("Gagal mengirim data. Cek koneksi internet."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleSubmitTeaching = async () => {
    if (!photo) {
      setErrors({ photo: "Foto bukti mengajar wajib diambil" });
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: 'teaching',
          name: user.name, 
          nip: user.nip, 
          date: formatDate(new Date()),
          startTime: startTime,
          endTime: endTime,
          classroom: selectedClassroom,
          subject: selectedSubject,
          photo 
        })
      });
      alert(`Laporan Mengajar di ${selectedClassroom} Berhasil Terkirim!`);
      setShowTeachingModal(false);
      stopCamera();
    } catch (err) { alert("Gagal mengirim laporan mengajar"); } finally { setIsSubmitting(false); }
  };

  const handleSubmitLeave = async () => {
    if (!leaveStartDate || !leaveReason) return;
    setIsSubmitting(true);
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: 'leave',
          name: user.name, 
          nip: user.nip, 
          submitDate: formatDate(new Date()),
          leaveType: leaveType, 
          startDate: leaveStartDate, 
          endDate: leaveEndDate, 
          reason: leaveReason, 
          photo: leaveAttachment || 'Tanpa Lampiran' 
        })
      });
      alert(`Izin ${leaveType} Berhasil Dikirim`);
      setShowLeaveModal(false);
      setLeaveAttachment(null);
    } catch (err) { alert("Gagal mengirim pengajuan izin"); } finally { setIsSubmitting(false); }
  };

  const ErrorMsg = ({ name }: { name: string }) => errors[name] ? <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1 animate-pulse"><AlertCircle size={10} /> {errors[name]}</p> : null;

  return (
    <div className="flex-1 pb-24 overflow-y-auto">
      <Header title="Dashboard" />
      
      <div className="px-6 mb-6">
        <div className="p-6 rounded-2xl glass overflow-hidden relative border-indigo-500/20">
          <div className="absolute top-0 right-0 p-4 opacity-10"><LogOut size={100} className="rotate-180" /></div>
          <h2 className="text-slate-400 text-sm font-medium">Halo, selamat pagi!</h2>
          <p className="text-xl font-bold text-white mt-1 truncate">{user.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span className="text-[10px] font-semibold uppercase">{user.role}</span>
            </div>
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
        <button onClick={() => openAttendanceModal('IN')} disabled={status !== 'IDLE'} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 transition-all disabled:opacity-50 group">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 group-active:scale-95 transition-transform"><LogIn className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs">Absen Masuk</span>
        </button>
        <button onClick={() => openAttendanceModal('OUT')} disabled={isPulangDisabled} className="flex flex-col items-center justify-center gap-2 p-5 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-all disabled:opacity-50 group relative overflow-hidden">
            <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 group-active:scale-95 transition-transform"><LogOut className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs">Absen Pulang</span>
        </button>
        <button onClick={handleOpenTeaching} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-amber-600/10 border border-amber-500/20 hover:bg-amber-600/20 transition-all group">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20 group-active:scale-95 transition-transform"><GraduationCap className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs">Absen Mengajar</span>
        </button>
        <button onClick={() => { clearErrors(); setShowLeaveModal(true); }} className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 transition-all group">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20 group-active:scale-95 transition-transform"><Coffee className="text-white" size={24} /></div>
            <span className="text-white font-bold text-xs">Ijin / Sakit</span>
        </button>
      </div>

      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => !isSubmitting && setShowAttendanceModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {attendanceType === 'IN' ? <LogIn size={20} className="text-emerald-500" /> : <LogOut size={20} className="text-indigo-500" />}
                Presensi {attendanceType === 'IN' ? 'Masuk' : 'Pulang'}
              </h3>
              <button disabled={isSubmitting} onClick={() => setShowAttendanceModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Guru Pegawai</span>
                  <span className="text-sm text-white font-semibold">{user.name}</span>
                  <span className="text-[10px] text-slate-400">NIP: {user.nip}</span>
              </div>

              <div className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${errors.location ? 'bg-red-500/5 border-red-500/40' : 'bg-slate-800/50 border-white/5'}`}>
                <div className="flex items-center gap-3 text-left w-full">
                  <div className={`p-2 rounded-lg ${location ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-500'}`}><Navigation size={18} className={gpsLoading ? 'animate-spin' : ''} /></div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Status GPS</span>
                    <span className="text-[11px] text-white font-mono block leading-tight">
                      {gpsLoading ? 'Mencari sinyal GPS...' : distance !== null ? `Terdeteksi: ${Math.round(distance / 1000)} km dari sekolah` : 'Menunggu data lokasi...'}
                    </span>
                    <span className="text-[9px] text-indigo-400 font-bold block mt-0.5 opacity-60">Trial Radius: 100km</span>
                    <ErrorMsg name="location" />
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold mb-3 block text-left px-1">Ambil Foto Wajah</span>
                <div className={`relative aspect-[3/4] w-full max-w-[280px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all ${errors.photo ? 'border-red-500' : 'border-indigo-500/30'}`}>
                  {photo ? (
                    <img src={photo} alt="Selfie" className="w-full h-full object-contain bg-slate-900" />
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  )}
                  {!photo && isCameraActive && (
                    <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-slate-900 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                      <Camera size={28} className="text-slate-900" />
                    </button>
                  )}
                  {photo && (
                    <button onClick={() => { setPhoto(null); startCamera(); }} className="absolute bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg active:scale-90 transition-transform">
                      <RefreshCw size={24}/>
                    </button>
                  )}
                </div>
                <ErrorMsg name="photo" />
              </div>

              <button 
                onClick={handleSubmitAttendance} 
                disabled={isSubmitting || (distance !== null && distance > ALLOWED_RADIUS_METERS) || gpsLoading} 
                className={`w-full py-5 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 ${isSubmitting || gpsLoading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 shadow-lg hover:bg-indigo-500 active:scale-[0.98]'}`}
              >
                {isSubmitting ? <CloudUpload className="animate-bounce" size={24} /> : <Check size={24} />}
                {isSubmitting ? 'Mengirim Data...' : `Kirim Absensi ${attendanceType === 'IN' ? 'Masuk' : 'Pulang'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeachingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => !isSubmitting && setShowTeachingModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><GraduationCap className="text-amber-500" /> Laporan Mengajar</h3>
                <button disabled={isSubmitting} onClick={() => setShowTeachingModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-4">
                <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Guru Pengajar</span>
                    <span className="text-sm text-white font-semibold">{user.name}</span>
                    <span className="text-[10px] text-slate-400">NIP: {user.nip}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Jam Mulai</span>
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none" />
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Jam Selesai</span>
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ruang Kelas</span>
                      <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none">
                          <option className="bg-slate-900">VII-A</option>
                          <option className="bg-slate-900">VII-B</option>
                          <option className="bg-slate-900">VIII-A</option>
                          <option className="bg-slate-900">VIII-B</option>
                          <option className="bg-slate-900">IX-A</option>
                          <option className="bg-slate-900">IX-B</option>
                      </select>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Mata Pelajaran</span>
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none">
                          <option className="bg-slate-900">Matematika</option>
                          <option className="bg-slate-900">Bahasa Indonesia</option>
                          <option className="bg-slate-900">IPA</option>
                          <option className="bg-slate-900">IPS</option>
                          <option className="bg-slate-900">Bahasa Inggris</option>
                          <option className="bg-slate-900">PJOK</option>
                          <option className="bg-slate-900">Seni Budaya</option>
                      </select>
                  </div>
                </div>
                <div className="text-center py-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold mb-3 block text-left px-1">Foto Bukti Kegiatan (3:4)</span>
                  <div className={`relative aspect-[3/4] w-full max-w-[280px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-xl transition-all ${errors.photo ? 'border-red-500' : 'border-amber-500/30'}`}>
                      {photo ? (
                        <img src={photo} alt="Teaching" className="w-full h-full object-contain bg-slate-900" />
                      ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                      )}
                      {!photo && (
                        <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-slate-900 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                          <Camera size={28} className="text-slate-900" />
                        </button>
                      )}
                      {photo && (
                        <button onClick={() => { setPhoto(null); startCamera(); }} className="absolute bottom-6 right-6 p-4 bg-amber-500 text-slate-900 rounded-full shadow-lg active:scale-90 transition-transform">
                          <RefreshCw size={24}/>
                        </button>
                      )}
                  </div>
                  <ErrorMsg name="photo" />
                </div>
                <button onClick={handleSubmitTeaching} disabled={isSubmitting} className={`w-full py-5 font-black rounded-2xl flex items-center justify-center gap-2 ${isSubmitting ? 'bg-amber-500/50' : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform'}`}>
                    {isSubmitting ? <CloudUpload className="animate-bounce" size={24} /> : <Check size={24} />}
                    {isSubmitting ? 'Sedang Mengirim...' : 'Kirim Laporan Mengajar'}
                </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => !isSubmitting && setShowLeaveModal(false)} />
            <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">Izin / Sakit</h3>
                    <button disabled={isSubmitting} onClick={() => { setShowLeaveModal(false); setLeaveAttachment(null); }} className="p-2 text-slate-400"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex bg-slate-800 p-1 rounded-xl">
                        {(['Izin', 'Sakit', 'Dinas'] as const).map(t => (
                            <button key={t} onClick={() => setLeaveType(t)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${leaveType === t ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Mulai</span>
                            <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} className="w-full bg-transparent text-white text-xs outline-none" />
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Selesai</span>
                            <input type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} className="w-full bg-transparent text-white text-xs outline-none" />
                        </div>
                    </div>
                    <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Alasan izin..." className="w-full p-4 bg-slate-800 border border-white/5 rounded-xl text-white text-sm h-24 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                    
                    <div className="p-4 bg-slate-800/50 border border-dashed border-white/10 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2 text-center">Lampiran Bukti (Opsional)</span>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      {leaveAttachment ? (
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 group">
                          <img src={leaveAttachment} alt="Attachment" className="w-full h-full object-cover" />
                          <button onClick={() => setLeaveAttachment(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-80 hover:opacity-100"><X size={14}/></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors border border-white/5 bg-slate-900/40 rounded-lg"
                        >
                          <Upload size={20} />
                          <span className="text-[10px] font-semibold uppercase">Ambil dari Galeri</span>
                        </button>
                      )}
                    </div>

                    <button onClick={handleSubmitLeave} disabled={isSubmitting} className={`w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all ${isSubmitting ? 'opacity-50' : ''}`}>
                        {isSubmitting ? <CloudUpload className="animate-bounce" size={20} /> : <Check size={20} />}
                        {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
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
