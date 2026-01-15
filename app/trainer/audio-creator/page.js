'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Mic, Square, Play, CheckCircle, Database, LayoutGrid, 
  Radio, Smartphone, Save, Trash2, Volume2, Music, Loader2, Target, Info
} from 'lucide-react'

export default function ProfessionalTrainerStudio() {
  // --- 1. CONFIGURATION DATA ---
  const SCENARIOS = [
    { id: 'SC-01', name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้า: "โทรมาจากไหนครับ/ไม่สนใจครับ"' },
    { id: 'SC-02', name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้า: "ตกลงฟังข้อเสนอครับ"' },
    { id: 'SC-03', name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้า: "ใช่ครับ ใช้อยู่วงเงิน..." ' },
    { id: 'SC-04', name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้า: "ตรวจทุกปี/แข็งแรงดี"' },
    { id: 'SC-05', name: 'Scenario 5', label: 'การนำเสนอผลิตภัณฑ์', guide: 'อัดเสียงสถานการณ์โต้ตอบขณะฟังความคุ้มครอง' },
    { id: 'SC-06', name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงคำถามจำลองที่ลูกค้าชอบถามบ่อยๆ' },
    { id: 'SC-07', name: 'Scenario 7', label: 'คำถามสุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ "เคย/ไม่เคย" ' },
    { id: 'SC-08', name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าตอบรับเรื่องเรทค่าเบี้ย' },
    { id: 'SC-10', name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอก ชื่อ/เลขบัตร/ผู้รับประโยชน์' }
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

  // --- 3. DATA SYNC LOGIC ---
  const syncData = useCallback(async (uid) => {
    // ดึงรายการโจทย์
    const { data: qData } = await supabase.from('questions')
      .select('*').eq('user_id', uid)
      .eq('target_department', session.dept).eq('target_level', session.level)
    if (qData) setQuestions(qData)

    // ดึงเป้าหมาย
    const { data: tData } = await supabase.from('target_settings')
      .select('targets').eq('user_id', uid)
      .eq('department', session.dept).eq('level', session.level).single()
    
    const defaultTargets = SCENARIOS.reduce((a, v) => ({ ...a, [v.name]: 5 }), {})
    setTargets(tData?.targets || defaultTargets)
  }, [session.dept, session.level])

  useEffect(() => {
    if (typeof window !== 'undefined') setUi(prev => ({ ...prev, basePath: window.location.origin }))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); syncData(user.id); }
    })
  }, [syncData])

  // --- 4. HANDLERS ---
  
  // ปรับเป้าหมายแยกอิสระ
  async function updateSingleTarget(newValue) {
    const val = parseInt(newValue) || 0
    const newTargets = { ...targets, [session.activeScen.name]: val }
    setTargets(newTargets)
    if (userId) {
      await supabase.from('target_settings').upsert({
        user_id: userId, department: session.dept, level: session.level, targets: newTargets
      }, { onConflict: 'user_id,department,level' })
    }
  }

  // ระบบอัดเสียง
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setRecording(prev => ({ ...prev, isRecording: false, blob, url: URL.createObjectURL(blob) }))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(prev => ({ ...prev, isRecording: true, url: null }))
    } catch (err) { alert("กรุณาอนุญาตการเข้าถึงไมโครโฟน") }
  }

  function stopRec() {
    if (mediaRef.current?.state !== 'inactive') mediaRef.current.stop()
  }

  // บันทึกโจทย์
  async function handleUpload() {
    if (!recording.blob || !recording.title) return alert("กรุณาระบุชื่อโจทย์และอัดเสียงก่อนบันทึก")
    setUi(prev => ({ ...prev, uploading: true }))
    
    const path = `questions/v_${Date.now()}.wav`
    await supabase.storage.from('recordings').upload(path, recording.blob)
    
    const newRecord = {
      question_text: recording.title,
      category: session.activeScen.name,
      target_department: session.dept,
      target_level: session.level,
      audio_question_url: path,
      type: 'audio_roleplay',
      user_id: userId
    }

    const { data, error } = await supabase.from('questions').insert([newRecord]).select()
    if (!error && data) {
      setQuestions(prev => [...prev, data[0]])
      setRecording({ isRecording: false, blob: null, url: null, title: '' })
      alert("บันทึกสำเร็จ!")
    }
    setUi(prev => ({ ...prev, uploading: false }))
  }

  // ลบโจทย์
  async function deleteQuestion(q) {
    if (!confirm(`ต้องการลบโจทย์ "${q.question_text}"?`)) return
    setUi(prev => ({ ...prev, deletingId: q.id }))
    await supabase.storage.from('recordings').remove([q.audio_question_url])
    await supabase.from('questions').delete().eq('id', q.id)
    setQuestions(prev => prev.filter(item => item.id !== q.id))
    setUi(prev => ({ ...prev, deletingId: null }))
  }

  // สร้าง PIN
  async function handleGeneratePIN() {
    if (questions.length === 0) return alert("อัดเสียงโจทย์อย่างน้อย 1 ข้อก่อนสร้าง PIN")
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    const { error } = await supabase.from('game_sessions').insert([{
      pin, user_id: userId, category: 'AudioArena',
      target_department: session.dept, target_level: session.level, is_active: true
    }])
    if (!error) { setUi(prev => ({ ...prev, pin })); alert("PIN: " + pin); }
  }

  // Helper สำหรับความคืบหน้า
  const getProgress = (name) => questions.filter(q => q.category === name).length
  const currentScenQuestions = questions.filter(q => q.category === session.activeScen.name)

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* TOP HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-200 animate-pulse">
              <Radio size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Simulator Trainer Studio</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Version 5.0 Stable</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition active:scale-95">
              <Smartphone size={20} /> QR Code
            </button>
            <button onClick={handleGeneratePIN} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition shadow-xl shadow-indigo-100 active:scale-95">
              <Database size={20} /> Generate PIN
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: CONFIG & PROGRESS */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <LayoutGrid size={14} /> Global Settings
              </h3>
              <div className="space-y-4">
                <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none focus:ring-2 ring-indigo-500 transition-all">
                  {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                </select>
                <select value={session.level} onChange={e => setSession(p => ({ ...p, level: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold appearance-none focus:ring-2 ring-indigo-500 transition-all">
                  {['Nursery','Rising Star','Legend'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </section>

            {/* ✅ กล่องปรับเป้าหมายแยกบท (Independent Target Box) */}
            <section className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-100 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} />
                <h3 className="font-black text-xs uppercase tracking-widest">Active Scenario Target</h3>
              </div>
              <p className="text-[10px] opacity-70 mb-2">เป้าหมายสำหรับ: {session.activeScen.name}</p>
              <input 
                type="number" 
                value={targets[session.activeScen.name] || 5} 
                onChange={(e) => updateSingleTarget(e.target.value)}
                className="w-full bg-indigo-500/50 border-none rounded-2xl p-3 font-black text-3xl text-center focus:ring-2 ring-white/50 outline-none"
              />
            </section>

            <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-4">Missions Progress</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {SCENARIOS.map(sc => (
                  <div key={sc.id} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-xs tracking-tight">{sc.name}</span>
                      <span className={`text-[10px] font-black ${getProgress(sc.name) >= (targets[sc.name] || 5) ? 'text-green-500' : 'text-slate-400'}`}>
                        {getProgress(sc.name)} / {targets[sc.name] || 5}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((getProgress(sc.name) / (targets[sc.name] || 5)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="lg:col-span-8 space-y-6">
            
            {/* RECORDER AREA */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Recording Mission</div>
                <div className="text-slate-300"><Info size={20} /></div>
              </div>
              <h2 className="text-3xl font-black text-slate-800">{session.activeScen.label}</h2>
              <p className="text-slate-500 mt-3 font-medium italic border-l-4 border-indigo-500 pl-4 py-1">"{session.activeScen.guide}"</p>

              <div className="mt-8 space-y-6">
                <input 
                  type="text" 
                  value={recording.title} 
                  onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-bold text-lg focus:border-indigo-500 outline-none transition-all shadow-inner"
                  placeholder="ตั้งชื่อโจทย์ที่กำลังจะอัด..." 
                />

                <div className="flex flex-col items-center justify-center p-12 bg-[#fafafa] rounded-[40px] border-2 border-dashed border-slate-200 relative overflow-hidden">
                  {!recording.isRecording ? (
                    <button onClick={startRec} className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-200 hover:scale-110 transition active:scale-95 z-10">
                      <Mic size={40} />
                    </button>
                  ) : (
                    <button onClick={stopRec} className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-300 animate-pulse z-10">
                      <Square size={35} />
                    </button>
                  )}
                  <p className="mt-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                    {recording.isRecording ? 'Listening to Trainer...' : 'Press Mic to Record Customer Voice'}
                  </p>
                </div>

                {recording.url && !recording.isRecording && (
                  <div className="p-6 bg-indigo-600 rounded-[32px] text-white flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex-1 w-full text-center md:text-left">
                      <p className="text-xs font-bold mb-2 opacity-80 uppercase tracking-widest">Preview Sound</p>
                      <audio src={recording.url} controls className="w-full h-10 rounded-lg overflow-hidden brightness-90 shadow-lg" />
                    </div>
                    <button onClick={handleUpload} disabled={ui.uploading} className="w-full md:w-auto bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition active:scale-95 disabled:opacity-50">
                      {ui.uploading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> SAVE TO LIBRARY</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ LIBRARY MANAGER AREA (The "Working" Summary) */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Music className="text-indigo-500" size={24} /> 
                  คลังโจทย์ของ {session.activeScen.name}
                </h3>
                <div className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                  {currentScenQuestions.length} โจทย์ในคลัง
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentScenQuestions.length === 0 ? (
                  <div className="text-center py-16 text-slate-300 border-2 border-dashed border-slate-50 rounded-[35px]">
                    <Volume2 size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold italic">ยังไม่มีโจทย์ใน Scenario นี้...</p>
                  </div>
                ) : (
                  currentScenQuestions.map((q) => (
                    <div key={q.id} className="group flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 rounded-3xl transition-all border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-all cursor-pointer">
                          <Play size={22} />
                        </div>
                        <div>
                          <p className="font-black text-slate-700 leading-tight">{q.question_text}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {q.id.split('-')[0]}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteQuestion(q)}
                        disabled={ui.deletingId === q.id}
                        className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        {ui.deletingId === q.id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PIN DISPLAY */}
            {ui.pin && (
              <div className="bg-yellow-400 p-10 rounded-[45px] flex items-center justify-between shadow-2xl shadow-yellow-100 border-4 border-white animate-in zoom-in-95 duration-500">
                <div>
                  <p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest opacity-60 mb-2">Active Training Session PIN</p>
                  <h4 className="text-6xl font-black text-slate-900 tracking-tighter">{ui.pin}</h4>
                </div>
                <Smartphone className="text-yellow-900 opacity-20" size={80} />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR MODAL */}
      {ui.showQR && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
          <div className="bg-white p-12 rounded-[50px] text-center max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <CheckCircle className="mx-auto text-green-500 mb-6" size={60} />
            <h2 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">System Ready</h2>
            <p className="text-slate-400 mb-10 font-medium text-sm">สแกนเพื่อให้พนักงานเริ่มภารกิจจำลองการขาย</p>
            <div className="bg-slate-50 p-8 rounded-[40px] inline-block border-2 border-slate-100 shadow-inner mb-10">
              <QRCodeCanvas value={`${ui.basePath}/play/audio`} size={200} level="H" />
            </div>
            <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-slate-800 transition tracking-widest shadow-xl">DONE</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}