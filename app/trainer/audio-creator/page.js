'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Mic, Square, Play, CheckCircle, Database, LayoutGrid, 
  Radio, Smartphone, Save, Trash2, Volume2, Music, Loader2 
} from 'lucide-react'

export default function ProfessionalTrainerStudio() {
  // --- CONFIGURATION ---
  const SCENARIOS = [
    { id: 'SC-01', name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้า: "โทรมาจากไหนครับ/ไม่สนใจครับ"' },
    { id: 'SC-02', name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้า: "ตกลงฟังข้อเสนอครับ"' },
    { id: 'SC-03', name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้า: "ใช่ครับ ใช้อยู่วงเงิน..." ' },
    { id: 'SC-04', name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้า: "ตรวจทุกปี/แข็งแรงดี"' },
    { id: 'SC-05', name: 'Scenario 5', label: 'การนำเสนอผลิตภัณฑ์', guide: 'อัดเสียงสถานการณ์โต้ตอบขณะฟังความคุ้มครอง' },
    { id: 'SC-06', name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงคำถามจำลองที่ลูกค้าชอบถามบ่อยๆ' },
    { id: 'SC-07', name: 'Scenario 7', label: 'คำถามสุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ "เคย/ไม่เคย"' },
    { id: 'SC-08', name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าตอบรับเรื่องเรทค่าเบี้ย' },
    { id: 'SC-10', name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอก ชื่อ/เลขบัตร/ผู้รับประโยชน์' }
  ];

  // --- STATES ---
  const [session, setSession] = useState({ dept: 'UOB', level: 'Nursery', activeScen: SCENARIOS[0] })
  const [targets, setTargets] = useState({})
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)
  
  const [recording, setRecording] = useState({ isRecording: false, blob: null, url: null, title: '' })
  const [ui, setUi] = useState({ uploading: false, showQR: false, pin: null, basePath: '', deletingId: null })

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // --- CORE LOGIC ---
  const syncData = useCallback(async (uid) => {
    const { data: qData } = await supabase.from('questions')
      .select('*').eq('user_id', uid)
      .eq('target_department', session.dept).eq('target_level', session.level)
    if (qData) setQuestions(qData)

    const { data: tData } = await supabase.from('target_settings')
      .select('targets').eq('user_id', uid)
      .eq('department', session.dept).eq('level', session.level).single()
    
    const initialTargets = SCENARIOS.reduce((a, v) => ({ ...a, [v.name]: 5 }), {})
    setTargets(tData?.targets || initialTargets)
  }, [session.dept, session.level])

  useEffect(() => {
    if (typeof window !== 'undefined') setUi(prev => ({ ...prev, basePath: window.location.origin }))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); syncData(user.id); }
    })
  }, [syncData])

  // --- AUDIO ENGINE ---
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
    } catch (err) { alert("Microphone Access Denied") }
  }

  function stopRec() {
    if (mediaRef.current?.state !== 'inactive') mediaRef.current.stop()
  }

  async function handleUpload() {
    if (!recording.blob || !recording.title) return alert("กรุณาอัดเสียงและระบุชื่อโจทย์")
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
    }
    setUi(prev => ({ ...prev, uploading: false }))
  }

  // ✅ ฟังก์ชันลบโจทย์ (Delete Logic)
  async function deleteQuestion(q) {
    if (!confirm(`ยืนยันการลบโจทย์: "${q.question_text}" ใช่หรือไม่?`)) return;
    
    setUi(prev => ({ ...prev, deletingId: q.id }))
    
    // 1. ลบไฟล์ใน Storage
    await supabase.storage.from('recordings').remove([q.audio_question_url])
    
    // 2. ลบแถวข้อมูลใน Database
    const { error } = await supabase.from('questions').delete().eq('id', q.id)
    
    if (!error) {
      setQuestions(prev => prev.filter(item => item.id !== q.id))
    }
    setUi(prev => ({ ...prev, deletingId: null }))
  }

  // --- RENDER HELPERS ---
  const getProgress = (name) => questions.filter(q => q.category === name).length
  const currentScenQuestions = questions.filter(q => q.category === session.activeScen.name)

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Radio className="text-red-500 animate-pulse" /> Simulator Studio
            </h1>
            <p className="text-slate-500 font-medium">Trainer Control Panel v3.5 (Management Mode)</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 md:flex-none bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition">
              <Smartphone size={18} /> QR Code
            </button>
            <button onClick={async () => {
              const pin = Math.floor(100000 + Math.random() * 900000).toString()
              await supabase.from('game_sessions').insert([{ pin, user_id: userId, category: 'AudioArena', target_department: session.dept, target_level: session.level, is_active: true }])
              setUi(p => ({ ...p, pin }))
            }} className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition shadow-lg shadow-indigo-200">
              <Database size={18} /> Generate PIN
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: PROGRESS & SELECTION */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-black mb-4 flex items-center gap-2 text-slate-400 uppercase text-xs tracking-widest"><LayoutGrid size={16} /> Configuration</h3>
              <div className="space-y-4">
                <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-indigo-500 appearance-none">
                  {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                </select>
                <select value={session.level} onChange={e => setSession(p => ({ ...p, level: e.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 ring-indigo-500 appearance-none">
                  {['Nursery','Rising Star','Legend'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <h3 className="font-black mb-4 text-xs text-slate-400 uppercase tracking-widest">Library Overview</h3>
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {SCENARIOS.map(sc => (
                  <div key={sc.id} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">{sc.name}</span>
                      <span className={`text-xs font-black ${getProgress(sc.name) >= (targets[sc.name] || 5) ? 'text-green-500' : 'text-slate-400'}`}>
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

          {/* RIGHT: WORKSPACE */}
          <main className="lg:col-span-8 space-y-6">
            
            {/* RECORDER PANEL */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Workspace</span>
              <h2 className="text-3xl font-black mt-2 text-slate-800">{session.activeScen.label}</h2>
              <p className="text-slate-500 mt-2 font-medium italic opacity-70">"{session.activeScen.guide}"</p>

              <div className="mt-8">
                <input type="text" value={recording.title} onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-lg focus:border-indigo-500 outline-none transition-all shadow-inner"
                  placeholder="พิมพ์หัวข้อโจทย์ที่คุณกำลังจะอัด..." />
              </div>

              <div className="mt-8 flex flex-col items-center justify-center p-10 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                {!recording.isRecording ? (
                  <button onClick={startRec} className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-200 hover:scale-110 transition active:scale-95 group">
                    <Mic size={32} />
                  </button>
                ) : (
                  <button onClick={stopRec} className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-300 animate-pulse">
                    <Square size={28} />
                  </button>
                )}
                <p className="mt-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                  {recording.isRecording ? 'Listening...' : 'Ready to record'}
                </p>
              </div>

              {recording.url && !recording.isRecording && (
                <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-2">
                  <div className="flex-1 w-full">
                    <audio src={recording.url} controls className="w-full h-10 rounded-lg brightness-90" />
                  </div>
                  <button onClick={handleUpload} disabled={ui.uploading} 
                    className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50">
                    {ui.uploading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> SAVE NOW</>}
                  </button>
                </div>
              )}
            </div>

            {/* ✅ MANAGEMENT PANEL: รายการโจทย์ที่อัดไปแล้วใน Scenario นี้ */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Music className="text-indigo-500" size={20} /> 
                  คลังโจทย์ของ {session.activeScen.name}
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {currentScenQuestions.length} โจทย์ในระบบ
                </span>
              </div>

              <div className="space-y-3">
                {currentScenQuestions.length === 0 ? (
                  <div className="text-center py-10 text-slate-300 border-2 border-dashed border-slate-50 rounded-3xl">
                    <Volume2 size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="font-bold italic">ยังไม่มีโจทย์ในบทนี้...</p>
                  </div>
                ) : (
                  currentScenQuestions.map((q) => (
                    <div key={q.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          <Play size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-700">{q.question_text}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {q.id.split('-')[0]}...</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteQuestion(q)}
                        disabled={ui.deletingId === q.id}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        {ui.deletingId === q.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {ui.pin && (
              <div className="bg-yellow-400 p-8 rounded-[40px] flex items-center justify-between border-4 border-white shadow-xl shadow-yellow-100 animate-in zoom-in-95">
                <div>
                  <p className="font-black text-yellow-900 uppercase text-[10px] tracking-widest">Session Key</p>
                  <h4 className="text-5xl font-black text-slate-900 leading-none">{ui.pin}</h4>
                </div>
                < स्मार्टफोन className="text-yellow-900/20" size={60} />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL QR */}
      {ui.showQR && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
          <div className="bg-white p-10 rounded-[50px] text-center max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <CheckCircle className="mx-auto text-green-500 mb-4" size={50} />
            <h2 className="text-2xl font-black mb-1">Ready to Stream</h2>
            <p className="text-slate-400 mb-8 font-medium text-sm">สแกนเพื่อให้พนักงานเริ่มทำภารกิจ</p>
            <div className="bg-white p-6 rounded-3xl inline-block border-2 border-slate-50 shadow-inner mb-8">
              <QRCodeCanvas value={`${ui.basePath}/play/audio`} size={200} level="H" />
            </div>
            <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black tracking-widest hover:bg-slate-800 transition">GOT IT</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  )
}