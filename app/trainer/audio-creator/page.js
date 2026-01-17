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
  // ✅ 1. ระบบป้องกัน Exception (ตัวเดิมที่เคยใช้แล้วได้ผล)
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

  // ✅ 2. ยืนยันการติดตั้งคอมโพเนนต์ก่อนเริ่มทำงาน (ลด Error บนมือถือ)
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setUi(p => ({ ...p, basePath: window.location.origin }))
    }
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadInitialData(user.id)
      }
    }
    getUser()
  }, [])

  const loadInitialData = async (uid) => {
    const { data: qData } = await supabase.from('questions').select('*').eq('user_id', uid).eq('target_department', session.dept).eq('target_level', session.level)
    if (qData) setQuestions(qData)
    const { data: tData } = await supabase.from('target_settings').select('targets').eq('user_id', uid).eq('department', session.dept).eq('level', session.level).single()
    setTargets(tData?.targets || SCENARIOS.reduce((a, v) => ({ ...a, [v.name]: 5 }), {}))
  }

  // ✅ 3. ฟังก์ชันอัดเสียงแบบ Safe-Mode
  async function startRec() {
    try {
      if (!navigator.mediaDevices) return alert("เครื่องนี้ไม่รองรับการอัดเสียง");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecording(p => ({ ...p, isRecording: false, blob, url: URL.createObjectURL(blob) }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(); 
      mediaRef.current = recorder;
      setRecording(p => ({ ...p, isRecording: true, url: null }));
    } catch (err) { alert("Mic Error: " + err.message); }
  }

  // ✅ 4. ฟังก์ชันบันทึกที่แก้ไขจุดบกพร่อง (Handle Save)
  async function handleSave() {
    if (!recording.blob || !recording.title) return alert("ระบุชื่อโจทย์ก่อน");
    if (!userId) return alert("รอระบบยืนยันตัวตนสักครู่...");

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
        setQuestions(p => [...p, data[0]]);
        setRecording({ isRecording: false, blob: null, url: null, title: '' });
        alert("บันทึกเรียบร้อย!");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUi(p => ({ ...p, uploading: false }));
    }
  }

  // ป้องกันการโหลดก่อน Client พร้อม
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="bg-white/70 backdrop-blur-md p-8 rounded-[40px] shadow-2xl flex flex-col md:flex-row justify-between items-center border border-white gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg"><Headphones size={32} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Trainer Studio</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Stable Master v6.1</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-black shadow-sm">QR Code</button>
            <button onClick={async () => {
              const pin = Math.floor(100000 + Math.random() * 900000).toString();
              await supabase.from('game_sessions').insert([{ pin, user_id: userId, category: 'MASTER_HUB', target_department: session.dept, target_level: session.level, is_active: true }]);
              setUi(p => ({ ...p, pin }));
            }} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black">GENERATE PIN</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* SIDEBAR & CONTENT (ใส่ส่วนดีไซน์เดิมกลับมาทั้งหมด) */}
          <aside className="lg:col-span-4 space-y-6">
             {/* ... ส่วนเลือก Scenario และตั้งค่าเป้าหมาย ... */}
             <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold mb-4">
                  {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                </select>
                <div className="bg-indigo-600 p-5 rounded-2xl text-white">
                  <p className="text-[10px] font-bold opacity-70 mb-1 tracking-widest">TARGET: {session.activeScen.name}</p>
                  <input type="number" value={targets[session.activeScen.name] || 5} onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    const nt = { ...targets, [session.activeScen.name]: val };
                    setTargets(nt);
                    supabase.from('target_settings').upsert({ user_id: userId, department: session.dept, level: session.level, targets: nt }, { onConflict: 'user_id,department,level' }).then();
                  }} className="w-full bg-white/10 border-none rounded-xl p-2 font-black text-2xl text-center focus:ring-0 outline-none" />
                </div>
             </div>
             {/* List Scenarios */}
             <div className="bg-white p-6 rounded-[35px] border border-slate-100 space-y-2 max-h-[400px] overflow-y-auto">
               {SCENARIOS.map(sc => (
                 <div key={sc.name} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} className={`p-4 rounded-2xl cursor-pointer border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-slate-50'}`}>
                   <div className="flex justify-between font-bold text-xs mb-1"><span>{sc.name}</span><span>{questions.filter(q => q.category === sc.name).length} / {targets[sc.name] || 5}</span></div>
                   <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((questions.filter(q => q.category === sc.name).length / (targets[sc.name] || 5)) * 100, 100)}%` }} /></div>
                 </div>
               ))}
             </div>
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
              <h2 className="text-3xl font-black text-slate-800">{session.activeScen.label}</h2>
              <p className="text-slate-400 mt-2 italic font-medium">"{session.activeScen.guide}"</p>
              
              <div className="mt-8 space-y-6">
                <input type="text" value={recording.title} onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-lg focus:border-indigo-500 outline-none transition-all" placeholder="ชื่อโจทย์..." />
                
                <div className="flex flex-col items-center p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                  <button onClick={!recording.isRecording ? startRec : () => mediaRef.current?.stop()} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${recording.isRecording ? 'bg-slate-900 animate-pulse' : 'bg-red-500'}`}>{recording.isRecording ? <Square color="white" /> : <Mic color="white" />}</button>
                </div>

                <AnimatePresence>
                  {recording.url && !recording.isRecording && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-indigo-600 rounded-[30px] flex flex-col md:flex-row items-center gap-6 text-white shadow-xl">
                      <audio src={recording.url} controls className="flex-1 w-full" />
                      <button onClick={handleSave} disabled={ui.uploading} className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black hover:bg-slate-100 transition shadow-lg">{ui.uploading ? <Loader2 className="animate-spin" /> : 'SAVE'}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {ui.pin && (
              <div className="bg-yellow-400 p-10 rounded-[45px] border-4 border-white shadow-2xl text-center">
                <p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest mb-2">Training PIN</p>
                <h4 className="text-6xl font-black text-slate-900 leading-none">{ui.pin}</h4>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL QR CODE */}
      {ui.showQR && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
          <div className="bg-white p-12 rounded-[50px] text-center max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 p-8 rounded-[40px] inline-block border-2 border-slate-100 shadow-inner mb-8">
              <QRCodeCanvas value={`${ui.basePath}/play/audio`} size={200} level="H" />
            </div>
            <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl transition-transform active:scale-95">CLOSE</button>
          </div>
        </div>
      )}
    </div>
  )
}