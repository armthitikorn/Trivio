'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, Square, Play, CheckCircle, Database, LayoutGrid, 
  Radio, Smartphone, Save, Trash2, Volume2, Music, Loader2, Target, Headphones 
} from 'lucide-react'

export default function UltimateTrainerStudio() {
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState(null)

  const SCENARIOS = [
    { name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้า: "โทรมาจากไหนครับ/ไม่สนใจครับ"' },
    { name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้า: "ตกลงฟังข้อเสนอครับ"' },
    { name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้า: "ใช้อยู่ครับ"' },
    { name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้าโต้ตอบเรื่องสุขภาพ' },
    { name: 'Scenario 5', label: 'การนำเสนอผลิตภัณฑ์', guide: 'อัดเสียงโต้ตอบขณะฟังความคุ้มครอง' },
    { name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงคำถามจำลองที่ลูกค้าชอบถาม' },
    { name: 'Scenario 7', label: 'สุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ "ไม่เคย/เคย"' },
    { name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าตอบรับเรื่องค่าเบี้ย' },
    { name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอก ชื่อ/เลขบัตร' }
  ];

  const [session, setSession] = useState({ dept: 'UOB', level: 'Nursery', activeScen: SCENARIOS[0] })
  const [targets, setTargets] = useState({})
  const [questions, setQuestions] = useState([])
  const [recording, setRecording] = useState({ isRecording: false, blob: null, url: null, title: '' })
  const [ui, setUi] = useState({ uploading: false, showQR: false, pin: null, basePath: '', deletingId: null })

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // ฟังก์ชันโหลดข้อมูล (แยกออกมาเพื่อให้เรียกซ้ำได้)
  const syncData = useCallback(async (uid) => {
    if (!uid) return;
    const { data: qData } = await supabase.from('questions')
      .select('*')
      .eq('user_id', uid)
      .eq('target_department', session.dept)
      .eq('target_level', session.level)
    if (qData) setQuestions(qData)

    const { data: tData } = await supabase.from('target_settings')
      .select('targets').eq('user_id', uid)
      .eq('department', session.dept)
      .eq('level', session.level).single()
    
    setTargets(tData?.targets || SCENARIOS.reduce((a, v) => ({ ...a, [v.name]: 5 }), {}))
  }, [session.dept, session.level])

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') setUi(p => ({ ...p, basePath: window.location.origin }))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        syncData(user.id)
      }
    })
  }, [syncData])

  // --- AUDIO LOGIC ---
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecording(p => ({ ...p, isRecording: false, blob: blob, url: URL.createObjectURL(blob) }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(); 
      mediaRef.current = recorder;
      setRecording(p => ({ ...p, isRecording: true, url: null }));
    } catch (err) { alert("Mic Access Error: " + err.message); }
  }

  // --- SAVE & SYNC ---
  async function handleSave() {
    if (!recording.blob || !recording.title) return alert("กรุณาอัดเสียงและระบุชื่อโจทย์");
    setUi(p => ({ ...p, uploading: true }));
    try {
      const path = `questions/v_${Date.now()}.wav`;
      const { error: uploadError } = await supabase.storage.from('recordings').upload(path, recording.blob);
      if (uploadError) throw uploadError;

      const newQ = { 
        question_text: recording.title, 
        category: session.activeScen.name, 
        target_department: session.dept, 
        target_level: session.level, 
        audio_question_url: path, 
        user_id: userId 
      };

      const { data, error: dbError } = await supabase.from('questions').insert([newQ]).select();
      if (dbError) throw dbError;

      if (data) {
        // อัปเดต State ทันทีเพื่อให้โจทย์ปรากฏในคลัง
        setQuestions(prev => [...prev, data[0]]);
        setRecording({ isRecording: false, blob: null, url: null, title: '' });
        alert("บันทึกโจทย์สำเร็จ!");
      }
    } catch (err) { alert("Save Error: " + err.message); }
    setUi(p => ({ ...p, uploading: false }));
  }

  async function handleDelete(q) {
    if (!confirm(`ยืนยันการลบโจทย์ "${q.question_text}"?`)) return;
    setUi(p => ({ ...p, deletingId: q.id }));
    await supabase.storage.from('recordings').remove([q.audio_question_url]);
    await supabase.from('questions').delete().eq('id', q.id);
    setQuestions(prev => prev.filter(item => item.id !== q.id));
    setUi(p => ({ ...p, deletingId: null }));
  }

  // ฟังก์ชันฟังเสียงในคลัง
  function playAudio(path) {
    const { data } = supabase.storage.from('recordings').getPublicUrl(path);
    const audio = new Audio(data.publicUrl);
    audio.play();
  }

  if (!mounted) return null;

  const currentLibrary = questions.filter(q => q.category === session.activeScen.name);

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-slate-900 selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="bg-white/80 backdrop-blur-md p-8 rounded-[40px] shadow-2xl flex flex-col md:flex-row justify-between items-center border border-white gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg"><Headphones size={32} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Trainer Studio</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Master Control v6.5</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-black shadow-sm">QR Code</button>
            <button onClick={async () => {
              const pin = Math.floor(100000 + Math.random() * 900000).toString();
              await supabase.from('game_sessions').insert([{ pin, user_id: userId, category: 'MASTER_HUB', target_department: session.dept, target_level: session.level, is_active: true }]);
              setUi(p => ({ ...p, pin }));
            }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl">GENERATE PIN</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* SIDEBAR */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100">
              <div className="space-y-4">
                <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold">
                  {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                </select>
                <div className="bg-indigo-600 p-5 rounded-[25px] text-white shadow-xl shadow-indigo-100">
                  <p className="text-[10px] font-black opacity-70 mb-2 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Target: {session.activeScen.name}</p>
                  <input type="number" value={targets[session.activeScen.name] || 5} onChange={e => {
                    const nt = { ...targets, [session.activeScen.name]: parseInt(e.target.value) || 0 }; setTargets(nt);
                    supabase.from('target_settings').upsert({ user_id: userId, department: session.dept, level: session.level, targets: nt }, { onConflict: 'user_id,department,level' });
                  }} className="w-full bg-white/10 border-none rounded-xl p-2 font-black text-3xl text-center focus:ring-0 outline-none" />
                </div>
              </div>
            </section>

            <section className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100 max-h-[450px] overflow-y-auto custom-scrollbar">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Missions Progress</h3>
              <div className="space-y-2">
                {SCENARIOS.map(sc => (
                  <div key={sc.name} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex justify-between font-black text-xs mb-2"><span>{sc.name}</span><span>{questions.filter(q => q.category === sc.name).length} / {targets[sc.name] || 5}</span></div>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((questions.filter(q => q.category === sc.name).length / (targets[sc.name] || 5)) * 100, 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="lg:col-span-8 space-y-8">
            <section className="bg-white p-10 md:p-14 rounded-[50px] shadow-sm border border-slate-100">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">{session.activeScen.label}</h2>
              <p className="text-slate-400 mt-2 italic font-medium">"{session.activeScen.guide}"</p>
              
              <div className="mt-10 space-y-6">
                <input type="text" value={recording.title} onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[30px] font-bold text-xl focus:border-indigo-500 outline-none shadow-inner" placeholder="ชื่อโจทย์ที่อัด..." />
                
                <div className="flex flex-col items-center p-14 bg-slate-50 rounded-[45px] border-4 border-dashed border-slate-200">
                  <button onClick={!recording.isRecording ? startRec : () => mediaRef.current?.stop()} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${recording.isRecording ? 'bg-slate-900 animate-pulse' : 'bg-red-500 hover:scale-110'}`}>{recording.isRecording ? <Square color="white" size={30} /> : <Mic color="white" size={35} />}</button>
                  <p className="mt-6 font-black text-slate-300 uppercase text-[10px] tracking-widest">{recording.isRecording ? 'RECORDING ACTIVE...' : 'PRESS MIC TO START'}</p>
                </div>

                <AnimatePresence>
                  {recording.url && !recording.isRecording && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-indigo-600 rounded-[35px] flex flex-col md:flex-row items-center gap-8 text-white shadow-2xl border-4 border-white">
                      <audio src={recording.url} controls className="flex-1 w-full rounded-xl overflow-hidden brightness-90 shadow-inner" />
                      <button onClick={handleSave} disabled={ui.uploading} className="bg-white text-indigo-600 px-12 py-5 rounded-[25px] font-black hover:bg-slate-100 transition shadow-lg">{ui.uploading ? <Loader2 className="animate-spin" /> : 'SAVE'}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* ✅ LIBRARY MANAGER: ส่วนที่เคยหายไป ผมนำกลับมาและทำให้เสถียรกว่าเดิมครับ */}
            <section className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-500"><Music size={28} /></div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 tracking-tight">คลังโจทย์ของ {session.activeScen.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total: {currentLibrary.length} Questions</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {currentLibrary.length === 0 ? (
                  <div className="text-center py-20 text-slate-200 border-4 border-dashed border-slate-50 rounded-[40px]">
                    <Volume2 size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black italic opacity-30">ไม่มีไฟล์เสียงในคลังสำหรับ Scenario นี้</p>
                  </div>
                ) : (
                  currentLibrary.map((q) => (
                    <div key={q.id} className="group flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 rounded-[35px] transition-all border-2 border-transparent hover:border-slate-200 shadow-sm">
                      <div className="flex items-center gap-6">
                        <div onClick={() => playAudio(q.audio_question_url)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer">
                          <Play size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-700 text-lg leading-tight">{q.question_text}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {q.id.split('-')[0]} • Audio: WAV</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(q)} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                        {ui.deletingId === q.id ? <Loader2 className="animate-spin" /> : <Trash2 size={22} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {ui.pin && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-12 rounded-[55px] flex items-center justify-between border-8 border-white shadow-2xl">
                <div><p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest opacity-60 mb-2">Training Session PIN</p><h4 className="text-7xl font-black text-slate-900 leading-none">{ui.pin}</h4></div>
                <Smartphone size={80} className="text-yellow-900 opacity-20" />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL QR CODE */}
      <AnimatePresence>
        {ui.showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
            <div className="bg-white p-14 rounded-[60px] text-center max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-50 p-10 rounded-[50px] inline-block border-2 border-slate-100 shadow-inner mb-10"><QRCodeCanvas value={`${ui.basePath}/play/audio`} size={240} level="H" /></div>
              <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl">DONE</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}