'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, Square, Play, CheckCircle, Database, LayoutGrid, 
  Radio, Smartphone, Save, Trash2, Volume2, Music, Loader2, Target, Info, Headphones 
} from 'lucide-react'

export default function ProfessionalTrainerStudio() {
  const SCENARIOS = [
    { name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้า: "ไม่สนใจครับ/โทรมาจากไหน"' },
    { name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้า: "ตกลงฟังครับ"' },
    { name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้า: "ใช้อยู่ครับ"' },
    { name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้าตอบเรื่องสุขภาพ' },
    { name: 'Scenario 5', label: 'นำเสนอผลิตภัณฑ์', guide: 'อัดเสียงโต้ตอบขณะนำเสนอ' },
    { name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงคำถามจำลองจากลูกค้า' },
    { name: 'Scenario 7', label: 'สุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ เคย/ไม่เคย' },
    { name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าเรื่องเบี้ยประกัน' },
    { name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอกข้อมูลส่วนตัว' }
  ];

  const [session, setSession] = useState({ dept: 'UOB', level: 'Nursery', activeScen: SCENARIOS[0] })
  const [targets, setTargets] = useState({})
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)
  const [recording, setRecording] = useState({ isRecording: false, blob: null, url: null, title: '' })
  const [ui, setUi] = useState({ uploading: false, showQR: false, pin: null, basePath: '', deletingId: null })

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const syncData = useCallback(async (uid) => {
    const { data: qData } = await supabase.from('questions').select('*').eq('user_id', uid).eq('target_department', session.dept).eq('target_level', session.level)
    if (qData) setQuestions(qData)
    const { data: tData } = await supabase.from('target_settings').select('targets').eq('user_id', uid).eq('department', session.dept).eq('level', session.level).single()
    setTargets(tData?.targets || SCENARIOS.reduce((a, v) => ({ ...a, [v.name]: 5 }), {}))
  }, [session.dept, session.level])

  useEffect(() => {
    if (typeof window !== 'undefined') setUi(p => ({ ...p, basePath: window.location.origin }))
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) { setUserId(user.id); syncData(user.id); } })
  }, [syncData])

  // --- AUDIO ENGINE ---
  async function startRec() {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = s;
    const r = new MediaRecorder(s); chunksRef.current = []; r.ondataavailable = e => chunksRef.current.push(e.data);
    r.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'audio/wav' });
      setRecording(p => ({ ...p, isRecording: false, blob: b, url: URL.createObjectURL(b) }));
      s.getTracks().forEach(t => t.stop());
    };
    r.start(); mediaRef.current = r; setRecording(p => ({ ...p, isRecording: true, url: null }));
  }

  // --- ✅ FIX: ฟังก์ชันฟังเสียงในคลัง (Library Play) ---
  function playFromLibrary(path) {
    const { data } = supabase.storage.from('recordings').getPublicUrl(path)
    const audio = new Audio(data.publicUrl)
    audio.play()
  }

  async function handleUpload() {
    if (!recording.blob || !recording.title) return alert("ระบุชื่อโจทย์ก่อนบันทึก");
    setUi(p => ({ ...p, uploading: true }));
    const path = `questions/v_${Date.now()}.wav`;
    await supabase.storage.from('recordings').upload(path, recording.blob);
    const newQ = { 
      question_text: recording.title, 
      category: session.activeScen.name, 
      target_department: session.dept, 
      target_level: session.level, 
      audio_question_url: path, 
      user_id: userId 
    };
    const { data } = await supabase.from('questions').insert([newQ]).select();
    if (data) { setQuestions(p => [...p, data[0]]); setRecording({ isRecording: false, blob: null, url: null, title: '' }); }
    setUi(p => ({ ...p, uploading: false }));
  }

  async function handleDelete(q) {
    if (!confirm(`ลบโจทย์ "${q.question_text}"?`)) return;
    setUi(p => ({ ...p, deletingId: q.id }));
    await supabase.storage.from('recordings').remove([q.audio_question_url]);
    await supabase.from('questions').delete().eq('id', q.id);
    setQuestions(prev => prev.filter(item => item.id !== q.id));
    setUi(p => ({ ...p, deletingId: null }));
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="bg-white p-8 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center border border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg animate-pulse"><Radio size={24} /></div>
            <div><h1 className="text-xl font-black">Trainer Studio v6.0</h1><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Insurance Training Center</p></div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 bg-slate-100 px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition"><Smartphone size={18} /> QR</button>
            <button onClick={async () => {
              const pin = Math.floor(100000 + Math.random() * 900000).toString();
              await supabase.from('game_sessions').insert([{ pin, user_id: userId, category: 'MASTER_HUB', target_department: session.dept, target_level: session.level, is_active: true }]);
              setUi(p => ({ ...p, pin }));
            }} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 transition"><Database size={18} /> สร้าง PIN ใหม่</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutGrid size={14} /> Global Config</h3>
              <div className="space-y-4">
                <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none">
                  {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                </select>
                <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2"><Target size={16} /><label className="text-[10px] font-black uppercase tracking-widest">Target: {session.activeScen.name}</label></div>
                  <input type="number" value={targets[session.activeScen.name] || 5} onChange={e => {
                    const nt = { ...targets, [session.activeScen.name]: parseInt(e.target.value) || 0 }; setTargets(nt);
                    supabase.from('target_settings').upsert({ user_id: userId, department: session.dept, level: session.level, targets: nt }, { onConflict: 'user_id,department,level' }).then();
                  }} className="w-full bg-indigo-500 border-none rounded-xl p-2 font-black text-2xl text-center outline-none focus:ring-2 ring-white/50" />
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm max-h-[450px] overflow-y-auto">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Missions Progress</h3>
              <div className="space-y-2">
                {SCENARIOS.map(sc => (
                  <div key={sc.name} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-transparent bg-slate-50'}`}>
                    <div className="flex justify-between font-black text-xs mb-1"><span>{sc.name}</span><span>{questions.filter(q => q.category === sc.name).length} / {targets[sc.name] || 5}</span></div>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((questions.filter(q => q.category === sc.name).length / (targets[sc.name] || 5)) * 100, 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <section className="bg-white p-10 rounded-[45px] border border-slate-100 shadow-sm">
              <h2 className="text-3xl font-black text-slate-800">{session.activeScen.label}</h2>
              <p className="text-slate-500 mt-2 font-medium italic border-l-4 border-indigo-500 pl-4">"{session.activeScen.guide}"</p>
              
              <div className="mt-8 space-y-6">
                <input type="text" value={recording.title} onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-lg focus:border-indigo-500 outline-none transition-all" placeholder="หัวข้อโจทย์ลูกค้า..." />
                <div className="flex flex-col items-center p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                  <button onClick={!recording.isRecording ? startRec : () => mediaRef.current?.stop()} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${recording.isRecording ? 'bg-slate-900 animate-pulse' : 'bg-red-500 hover:scale-110 transition'}`}>{recording.isRecording ? <Square color="white" /> : <Mic color="white" />}</button>
                </div>
                {recording.url && !recording.isRecording && (
                  <div className="p-6 bg-indigo-600 rounded-[30px] flex items-center gap-4 text-white animate-in slide-in-from-bottom-2">
                    <audio src={recording.url} controls className="flex-1" />
                    <button onClick={handleSave} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black">{ui.uploading ? <Loader2 className="animate-spin" /> : 'SAVE'}</button>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h3 className="font-black text-lg flex items-center gap-2 mb-6"><Music className="text-indigo-500" /> คลังโจทย์ของ {session.activeScen.name}</h3>
              <div className="space-y-3">
                {questions.filter(q => q.category === session.activeScen.name).map((q) => (
                  <div key={q.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      {/* ✅ แก้ไขจุดนี้: ปุ่มฟังเสียงในคลัง */}
                      <div onClick={() => playFromLibrary(q.audio_question_url)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-all cursor-pointer"><Play size={18} /></div>
                      <div><p className="font-bold text-sm text-slate-700">{q.question_text}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {q.id.split('-')[0]}</p></div>
                    </div>
                    <button onClick={() => handleDelete(q)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">{ui.deletingId === q.id ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}</button>
                  </div>
                ))}
              </div>
            </section>

            {ui.pin && (
              <div className="bg-yellow-400 p-8 rounded-[45px] text-center border-4 border-white shadow-2xl animate-in zoom-in-95">
                <p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest opacity-60 mb-1">Active Session PIN</p>
                <h4 className="text-6xl font-black text-slate-900">{ui.pin}</h4>
              </div>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {ui.showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
            <div className="bg-white p-12 rounded-[50px] text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-50 p-8 rounded-[40px] inline-block border-2 border-slate-100 shadow-inner mb-8"><QRCodeCanvas value={`${ui.basePath}/play/audio`} size={240} level="H" /></div>
              <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl">ปิดหน้าจอ</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}