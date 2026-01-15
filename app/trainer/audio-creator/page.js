'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Mic, Square, Play, CheckCircle, Database, LayoutGrid, 
  Radio, Smartphone, Save, Trash2, Volume2, Music, 
  Loader2, Target, Info, ChevronRight, Settings, 
  Layers, Headphones, Activity
} from 'lucide-react'

export default function ProfessionalTrainerStudio() {
  // --- 1. CONFIGURATION DATA ---
  const SCENARIOS = [
    { id: 'SC-01', name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้าโต้ตอบพนักงานในด่านแรก เช่น "โทรมาจากไหนครับ/ไม่สนใจครับ/ยังไม่ว่าง"' },
    { id: 'SC-02', name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้าตอบตกลงฟังข้อเสนอ หลังจากพนักงานแนะนำตัวตามสคริปต์' },
    { id: 'SC-03', name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้าตอบรับ เช่น "ใช่ครับ ใช้อยู่ครับ" เมื่อถามเรื่องการใช้จ่ายผ่านบัตร' },
    { id: 'SC-04', name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้าตอบเรื่องการตรวจสุขภาพประจำปี หรือการทานยาประจำตัว' },
    { id: 'SC-05', name: 'Scenario 5', label: 'การนำเสนอผลิตภัณฑ์', guide: 'อัดเสียงสถานการณ์โต้ตอบขณะพนักงานเริ่มอธิบายความคุ้มครองโครงการ' },
    { id: 'SC-06', name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงเทรนเนอร์ (จำลองเป็นลูกค้า) ถามคำถามข้อสงสัยทั่วไปเกี่ยวกับประกัน' },
    { id: 'SC-07', name: 'Scenario 7', label: 'คำถามสุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ "ไม่เคย" หรือ "เคย" (กรณีเคย ต้องอัดเสียงตอบรายละเอียดโรค)' },
    { id: 'SC-08', name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าตอบยืนยันอายุ หรือตอบเรื่องฐานการลดหย่อนภาษี' },
    { id: 'SC-10', name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอกข้อมูลส่วนตัว: ชื่อ / ที่อยู่ / เลขบัตร / และตอบตกลง' }
  ];

  // --- 2. STATES ---
  const [session, setSession] = useState({ dept: 'UOB', level: 'Nursery', activeScen: SCENARIOS[0] })
  const [targets, setTargets] = useState({})
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)
  const [recording, setRecording] = useState({ isRecording: false, blob: null, url: null, title: '' })
  const [ui, setUi] = useState({ uploading: false, showQR: false, pin: null, basePath: '', deletingId: null })

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // --- 3. DATA PERSISTENCE ---
  const syncData = useCallback(async (uid) => {
    // โหลดรายการโจทย์ทั้งหมด
    const { data: qData } = await supabase.from('questions')
      .select('*').eq('user_id', uid)
      .eq('target_department', session.dept)
      .eq('target_level', session.level)
    if (qData) setQuestions(qData)

    // โหลดเป้าหมายของแต่ละบท
    const { data: tData } = await supabase.from('target_settings')
      .select('targets').eq('user_id', uid)
      .eq('department', session.dept)
      .eq('level', session.level).single()
    
    const defaultTargets = SCENARIOS.reduce((acc, v) => ({ ...acc, [v.name]: 5 }), {})
    setTargets(tData?.targets || defaultTargets)
  }, [session.dept, session.level])

  useEffect(() => {
    if (typeof window !== 'undefined') setUi(prev => ({ ...prev, basePath: window.location.origin }))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); syncData(user.id); }
    })
  }, [syncData])

  // --- 4. INDEPENDENT TARGET HANDLER ---
  async function handleTargetUpdate(newValue) {
    const val = parseInt(newValue) || 0
    const newTargets = { ...targets, [session.activeScen.name]: val }
    setTargets(newTargets)
    if (userId) {
      await supabase.from('target_settings').upsert({
        user_id: userId, department: session.dept, level: session.level, targets: newTargets
      }, { onConflict: 'user_id,department,level' })
    }
  }

  // --- 5. AUDIO ENGINE (NO-FREEZE) ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setRecording(prev => ({ ...prev, isRecording: false, blob, url: URL.createObjectURL(blob) }))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(prev => ({ ...prev, isRecording: true, url: null }))
    } catch (err) { alert("ไม่สามารถเปิดไมโครโฟนได้: " + err.message) }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop()
  }

  // --- 6. STORAGE & DB HANDLERS ---
  async function handleSave() {
    if (!recording.blob || !recording.title) return alert("กรุณาระบุชื่อบทสนทนาและอัดเสียงก่อนบันทึก")
    setUi(p => ({ ...p, uploading: true }))
    
    const filePath = `questions/v_${Date.now()}.wav`
    const { error: uploadError } = await supabase.storage.from('recordings').upload(filePath, recording.blob)
    
    if (uploadError) {
      alert("Error uploading: " + uploadError.message)
      setUi(p => ({ ...p, uploading: false })); return
    }

    const newQuestion = {
      question_text: recording.title,
      category: session.activeScen.name,
      target_department: session.dept,
      target_level: session.level,
      audio_question_url: filePath,
      type: 'audio_roleplay',
      user_id: userId
    }

    const { data, error: dbError } = await supabase.from('questions').insert([newQuestion]).select()
    
    if (!dbError && data) {
      setQuestions(prev => [...prev, data[0]])
      setRecording({ isRecording: false, blob: null, url: null, title: '' })
      alert("บันทึกโจทย์เข้าคลังสำเร็จ!")
    }
    setUi(p => ({ ...p, uploading: false }))
  }

  async function handleDelete(q) {
    if (!confirm(`คุณต้องการลบโจทย์ "${q.question_text}" ออกจากระบบถาวรหรือไม่?`)) return
    setUi(p => ({ ...p, deletingId: q.id }))
    
    // ลบไฟล์เสียงออกจาก Storage
    await supabase.storage.from('recordings').remove([q.audio_question_url])
    // ลบข้อมูลออกจากฐานข้อมูล
    const { error } = await supabase.from('questions').delete().eq('id', q.id)
    
    if (!error) {
      setQuestions(prev => prev.filter(item => item.id !== q.id))
    } else {
      alert("ไม่สามารถลบข้อมูลได้: " + error.message)
    }
    setUi(p => ({ ...p, deletingId: null }))
  }

  // --- 7. PIN GENERATOR ---
  async function generatePIN() {
    if (questions.length === 0) return alert("กรุณาสร้างโจทย์อย่างน้อย 1 ข้อก่อนสร้าง PIN")
    const newPin = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin: newPin, user_id: userId, category: 'MASTER_HUB',
      target_department: session.dept, target_level: session.level, is_active: true
    }])
    if (!error) {
      setUi(p => ({ ...p, pin: newPin }))
      alert("สร้างรหัส PIN ใหม่เรียบร้อย: " + newPin)
    }
  }

  // --- 8. HELPERS ---
  const countQuestions = (catName) => questions.filter(q => q.category === catName).length
  const currentLibrary = questions.filter(q => q.category === session.activeScen.name)

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-600">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER: Glassmorphism Design --- */}
        <header className="flex flex-col lg:flex-row justify-between items-center bg-white/80 backdrop-blur-md p-8 rounded-[45px] shadow-xl shadow-slate-200/50 border border-white gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 rounded-3xl text-white shadow-lg shadow-rose-200 animate-pulse">
              <Radio size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Insurance Simulator Studio</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">v5.5 Professional</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Activity size={10} /> Live System</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 lg:flex-none bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
              <Smartphone size={20} /> QR Code
            </button>
            <button onClick={generatePIN} className="flex-1 lg:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 active:scale-95">
              <Database size={20} /> Generate PIN
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* --- SIDEBAR: Progress & Controls --- */}
          <aside className="lg:col-span-4 space-y-8">
            <section className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-100">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Settings size={16} className="text-indigo-500" /> Global Settings
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">แผนกประกัน (Department)</label>
                  <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none focus:ring-4 ring-indigo-50">
                    {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">ระดับพนักงาน (Experience)</label>
                  <select value={session.level} onChange={e => setSession(p => ({ ...p, level: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none focus:ring-4 ring-indigo-50">
                    {['Nursery','Rising Star','Legend'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                
                {/* 🎯 INDEPENDENT TARGET EDITOR */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[35px] text-white shadow-xl shadow-indigo-100 mt-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500"><Target size={80} /></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Target Adjustment</span>
                    </div>
                    <p className="text-xs font-bold mb-3 opacity-60">ระบุจำนวนโจทย์ที่คุณต้องการสำหรับบทนี้:</p>
                    <input 
                      type="number" 
                      value={targets[session.activeScen.name] || 5} 
                      onChange={(e) => handleTargetUpdate(e.target.value)}
                      className="w-full bg-white/20 border-none rounded-2xl p-4 font-black text-4xl text-center focus:ring-4 ring-white/30 outline-none transition-all"
                    />
                    <p className="text-[10px] mt-4 font-bold text-center opacity-40 uppercase tracking-tighter">Current บทเรียน: {session.activeScen.name}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-100">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Layers size={16} /> Mission Map</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                {SCENARIOS.map(sc => {
                  const count = countQuestions(sc.name);
                  const target = targets[sc.name] || 5;
                  const isComplete = count >= target && target > 0;
                  return (
                    <div key={sc.name} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} 
                      className={`p-5 rounded-3xl cursor-pointer transition-all border-2 group ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50 shadow-md translate-x-1' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-black text-sm ${session.activeScen.name === sc.name ? 'text-indigo-600' : 'text-slate-700'}`}>{sc.name}</span>
                        <div className="flex items-center gap-1">
                          {isComplete && <CheckCircle size={14} className="text-green-500" />}
                          <span className={`text-[10px] font-black ${isComplete ? 'text-green-500' : 'text-slate-400'}`}>
                            {count} / {target}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((count / target) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>

          {/* --- MAIN: Recording & Library Manager --- */}
          <main className="lg:col-span-8 space-y-8">
            
            {/* WORKSPACE AREA */}
            <div className="bg-white p-10 md:p-14 rounded-[50px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 text-slate-50 opacity-10"><Headphones size={150} /></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-indigo-50 text-indigo-600 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Active Workspace</span>
                  <div className="flex-1 h-[2px] bg-slate-50" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">{session.activeScen.label}</h2>
                <div className="mt-4 p-6 bg-slate-50 rounded-[30px] border-l-8 border-indigo-500">
                  <p className="text-slate-500 font-bold italic leading-relaxed">"{session.activeScen.guide}"</p>
                </div>

                <div className="mt-10 space-y-8">
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest">ชื่อหัวข้อโจทย์ลูกค้า (เช่น: ลูกค้าไม่สนใจสายแรก)</label>
                    <input 
                      type="text" 
                      value={recording.title} 
                      onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} 
                      className="w-full p-6 bg-white border-2 border-slate-100 rounded-[35px] font-bold text-xl focus:border-indigo-500 outline-none transition-all shadow-sm focus:shadow-indigo-100"
                      placeholder="พิมพ์หัวข้อบทสนทนาที่นี่..." 
                    />
                  </div>

                  {/* RECORDER BUTTONS */}
                  <div className="flex flex-col items-center justify-center p-16 bg-[#fafafa] rounded-[50px] border-4 border-dashed border-slate-100 relative">
                    {!recording.isRecording ? (
                      <button onClick={startRecording} className="w-28 h-28 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-200 hover:scale-110 hover:bg-red-600 transition-all active:scale-95 group">
                        <Mic size={45} className="group-hover:rotate-12 transition-transform" />
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="w-28 h-28 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-300 animate-pulse active:scale-95">
                        <Square size={40} />
                      </button>
                    )}
                    <p className="mt-8 font-black text-slate-300 uppercase text-xs tracking-widest">
                      {recording.isRecording ? 'กำลังบันทึกเสียงลูกค้า...' : 'กดปุ่มสีแดงเพื่ออัดเสียงลูกค้า (เทรนเนอร์)'}
                    </p>
                  </div>

                  {/* PREVIEW & SAVE */}
                  <AnimatePresence>
                    {recording.url && !recording.isRecording && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-indigo-600 rounded-[40px] text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-indigo-200 border-4 border-white">
                        <div className="flex-1 w-full">
                          <p className="text-[10px] font-black mb-3 uppercase tracking-[0.3em] opacity-80">Preview Recording</p>
                          <audio src={recording.url} controls className="w-full h-12 rounded-xl overflow-hidden brightness-95 shadow-inner" />
                        </div>
                        <button onClick={handleSave} disabled={ui.uploading} className="w-full md:w-auto bg-white text-indigo-700 px-12 py-5 rounded-[25px] font-black flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-lg">
                          {ui.uploading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> SAVE TO HUB</>}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* LIBRARY MANAGER */}
            <div className="bg-white p-10 md:p-14 rounded-[50px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-500"><Music size={28} /></div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 tracking-tight">คลังโจทย์ของ {session.activeScen.name}</h3>
                    <p className="text-xs font-bold text-slate-400">จัดการข้อมูลไฟล์เสียงที่คุณอัดไว้ในบทนี้</p>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-2 rounded-full text-xs font-black text-slate-400 border border-slate-100">
                  {currentLibrary.length} โจทย์ในคลัง
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {currentLibrary.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 border-4 border-dashed border-slate-50 rounded-[45px]">
                    <Volume2 size={64} className="mx-auto mb-4 opacity-5" />
                    <p className="font-black italic text-lg opacity-20 tracking-tighter uppercase">No Sound Data Available</p>
                  </div>
                ) : (
                  currentLibrary.map((q) => (
                    <div key={q.id} className="group flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 rounded-[35px] transition-all border-2 border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer">
                          <Play size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-700 text-lg leading-tight">{q.question_text}</p>
                          <div className="flex items-center gap-3 mt-1 opacity-40">
                            <p className="text-[10px] font-bold uppercase tracking-widest">ID: {q.id.split('-')[0]}</p>
                            <div className="w-1 h-1 bg-slate-400 rounded-full" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Audio: WAV</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(q)}
                        disabled={ui.deletingId === q.id}
                        className="p-5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-3xl transition-all active:scale-90"
                      >
                        {ui.deletingId === q.id ? <Loader2 className="animate-spin" size={24} /> : <Trash2 size={24} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PIN DISPLAY: Gold Theme */}
            <AnimatePresence>
              {ui.pin && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-yellow-400 to-orange-500 p-12 rounded-[55px] flex items-center justify-between shadow-2xl shadow-orange-200 border-8 border-white">
                  <div>
                    <p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest opacity-60 mb-2">Active Training Session PIN</p>
                    <h4 className="text-7xl font-black text-slate-900 tracking-tighter drop-shadow-md">{ui.pin}</h4>
                    <p className="text-sm font-bold text-yellow-900/60 mt-4 italic">* ให้พนักงานใช้รหัสนี้ในการเข้าถึงภารกิจ</p>
                  </div>
                  <div className="bg-white/30 p-8 rounded-[40px] text-yellow-900">
                    <Smartphone size={80} strokeWidth={2.5} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* QR MODAL: Professional Overlay */}
      <AnimatePresence>
        {ui.showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white p-14 rounded-[60px] text-center max-w-md w-full shadow-2xl shadow-indigo-500/20" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><CheckCircle size={40} /></div>
              <h2 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">System Ready</h2>
              <p className="text-slate-400 mb-10 font-bold text-sm tracking-tight">สแกนเพื่อให้พนักงานเริ่มภารกิจจำลองการขาย</p>
              <div className="bg-slate-50 p-10 rounded-[50px] inline-block border-2 border-slate-100 shadow-inner mb-10">
                <QRCodeCanvas value={`${ui.basePath}/play/audio`} size={240} level="H" />
              </div>
              <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black hover:bg-slate-800 transition-all tracking-widest shadow-xl">CLOSE CONTROL</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}