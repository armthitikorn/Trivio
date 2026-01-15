'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { Mic, Square, Play, CheckCircle, Database, LayoutGrid, Radio, Smartphone, Save } from 'lucide-react'

export default function ProfessionalTrainerStudio() {
  // --- CONFIGURATION ---
  const SCENARIOS = [
    { id: 'SC-01', name: 'Scenario 1', label: 'การติดต่อลูกค้า', guide: 'อัดเสียงลูกค้า: "โทรมาจากไหนครับ/ไม่สนใจครับ"' },
    { id: 'SC-02', name: 'Scenario 2', label: 'การแนะนำตัว', guide: 'อัดเสียงลูกค้า: "ตกลงฟังข้อเสนอครับ"' },
    { id: 'SC-03', name: 'Scenario 3', label: 'การเช็คบัตร', guide: 'อัดเสียงลูกค้า: "ใช่ครับ ใช้อยู่วงเงิน..." ' },
    { id: 'SC-04', name: 'Scenario 4', label: 'สุขภาพเบื้องต้น', guide: 'อัดเสียงลูกค้า: "ตรวจทุกปี/แข็งแรงดี"' },
    { id: 'SC-05', name: 'Scenario 5', label: 'การนำเสนอผลิตภัณฑ์', guide: 'อัดเสียงสถานการณ์โต้ตอบขณะฟังความคุ้มครอง' },
    { id: 'SC-06', name: 'Scenario 6', label: 'ลูกค้าสอบถาม', guide: 'อัดเสียงคำถามจำลองที่ลูกค้าชอบถามบ่อยๆ' },
    { id: 'SC-07', name: 'Scenario 7', label: 'คำถามสุขภาพ 5 ข้อ', guide: 'อัดเสียงลูกค้าตอบ "เคย/ไม่เคย" (เน้นรายละเอียดโรค)' },
    { id: 'SC-08', name: 'Scenario 8', label: 'แจ้งเบี้ยและภาษี', guide: 'อัดเสียงลูกค้าตอบรับเรื่องเรทค่าเบี้ย' },
    { id: 'SC-10', name: 'Scenario 10', label: 'การลงทะเบียน', guide: 'อัดเสียงลูกค้าบอก ชื่อ/เลขบัตร/ผู้รับประโยชน์' }
  ];

  // --- STATES ---
  const [session, setSession] = useState({ dept: 'UOB', level: 'Nursery', activeScen: SCENARIOS[0] })
  const [targets, setTargets] = useState({})
  const [questions, setQuestions] = useState([])
  const [userId, setUserId] = useState(null)
  
  const [recording, setRecording] = useState({ isRecording: false, blob: null, url: null, title: '' })
  const [ui, setUi] = useState({ uploading: false, showQR: false, pin: null, basePath: '' })

  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  // --- CORE LOGIC ---
  const syncData = useCallback(async (uid) => {
    // ดึงโจทย์ทั้งหมด
    const { data: qData } = await supabase.from('questions')
      .select('*').eq('user_id', uid)
      .eq('target_department', session.dept).eq('target_level', session.level)
    if (qData) setQuestions(qData)

    // ดึงเป้าหมาย
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
    
    const path = `voice_${Date.now()}.wav`
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

    const { error } = await supabase.from('questions').insert([newRecord])
    if (!error) {
      setQuestions(prev => [...prev, newRecord])
      setRecording({ isRecording: false, blob: null, url: null, title: '' })
      alert("บันทึกโจทย์ลงคลังสำเร็จ!")
    }
    setUi(prev => ({ ...prev, uploading: false }))
  }

  // --- RENDER HELPERS ---
  const getProgress = (name) => questions.filter(q => q.category === name).length

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Radio className="text-red-500 animate-pulse" /> Simulator Studio
            </h1>
            <p className="text-slate-500 font-medium">Trainer Control Panel v3.0</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setUi(p => ({ ...p, showQR: true }))} className="flex-1 md:flex-none bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition">
              <Smartphone size={20} /> QR Code
            </button>
            <button onClick={async () => {
              const pin = Math.floor(100000 + Math.random() * 900000).toString()
              await supabase.from('game_sessions').insert([{ pin, user_id: userId, category: 'AudioArena', target_department: session.dept, target_level: session.level, is_active: true }])
              setUi(p => ({ ...p, pin }))
            }} className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition shadow-lg shadow-indigo-200">
              <Database size={20} /> Generate PIN
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: SELECTION & STATS */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-black mb-4 flex items-center gap-2"><LayoutGrid size={18} /> Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
                  <select value={session.dept} onChange={e => setSession(p => ({ ...p, dept: e.target.value }))} className="w-full mt-1 p-3 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 ring-indigo-500">
                    {['UOB','AYCAP','ttb','Krungsri','Agent','Broker'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Experience Level</label>
                  <select value={session.level} onChange={e => setSession(p => ({ ...p, level: e.target.value }))} className="w-full mt-1 p-3 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 ring-indigo-500">
                    {['Nursery','Rising Star','Legend'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <h3 className="font-black mb-4">Library Progress</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {SCENARIOS.map(sc => (
                  <div key={sc.id} onClick={() => setSession(p => ({ ...p, activeScen: sc }))} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${session.activeScen.name === sc.name ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">{sc.name}</span>
                      <span className={`text-xs font-black ${getProgress(sc.name) >= (targets[sc.name] || 5) ? 'text-green-500' : 'text-slate-400'}`}>
                        {getProgress(sc.name)} / {targets[sc.name] || 5}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min((getProgress(sc.name) / (targets[sc.name] || 5)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* RIGHT: MAIN RECORDING AREA */}
          <main className="lg:col-span-8 space-y-6">
            
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Mic size={120} />
              </div>

              <div className="relative z-10">
                <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">Active Lesson</span>
                <h2 className="text-3xl font-black mt-2 text-slate-800">{session.activeScen.label}</h2>
                <p className="text-slate-500 mt-2 font-medium bg-slate-50 p-4 rounded-2xl border-l-4 border-indigo-500 italic">
                  &ldquo;{session.activeScen.guide}&rdquo;
                </p>

                <div className="mt-8">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">โจทย์เสียงนี้เกี่ยวกับอะไร? (เช่น ลูกค้าไม่ว่าง/มีประกันแล้ว)</label>
                  <input type="text" value={recording.title} onChange={e => setRecording(p => ({ ...p, title: e.target.value }))} 
                    className="w-full mt-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg focus:border-indigo-500 outline-none transition-all"
                    placeholder="ตั้งชื่อหัวข้อโจทย์ลูกค้า..." />
                </div>

                <div className="mt-8 flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[35px] border-2 border-dashed border-slate-200">
                  {!recording.isRecording ? (
                    <button onClick={startRec} className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-200 hover:scale-110 transition active:scale-95 group">
                      <Mic size={40} className="group-hover:animate-bounce" />
                    </button>
                  ) : (
                    <button onClick={stopRec} className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-300 animate-pulse">
                      <Square size={35} />
                    </button>
                  )}
                  <p className="mt-4 font-black text-slate-400 uppercase tracking-tighter">
                    {recording.isRecording ? 'กำลังฟังเสียงเทรนเนอร์...' : 'กดปุ่มสีแดงเพื่อเริ่มอัด'}
                  </p>
                </div>

                {recording.url && !recording.isRecording && (
                  <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex-1 w-full">
                      <p className="font-bold mb-2 flex items-center gap-2"><Play size={16} /> Preview Recording</p>
                      <audio src={recording.url} controls className="w-full h-10 rounded-lg overflow-hidden brightness-90" />
                    </div>
                    <button onClick={handleUpload} disabled={ui.uploading} 
                      className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition active:scale-95 disabled:opacity-50">
                      {ui.uploading ? 'UPLOADING...' : <><Save size={20} /> SAVE TO LIBRARY</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {ui.pin && (
              <div className="bg-yellow-400 p-8 rounded-[35px] flex items-center justify-between shadow-lg shadow-yellow-100 border-4 border-white animate-bounce">
                <div>
                  <p className="font-black text-yellow-900 uppercase text-sm tracking-widest">Active Training PIN</p>
                  <h4 className="text-5xl font-black text-slate-900">{ui.pin}</h4>
                </div>
                <div className="text-right hidden md:block">
                  <p className="font-bold text-yellow-900 leading-tight">นำเลขนี้ให้พนักงาน<br/>กรอกเพื่อเริ่มฝึก</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR MODAL */}
      {ui.showQR && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-6" onClick={() => setUi(p => ({ ...p, showQR: false }))}>
          <div className="bg-white p-10 rounded-[50px] text-center max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <CheckCircle className="mx-auto text-green-500 mb-4" size={50} />
            <h2 className="text-2xl font-black mb-2 text-slate-800">Ready to Train</h2>
            <p className="text-slate-500 mb-8 font-medium">สแกนเพื่อให้พนักงานเข้าสู่ระบบ</p>
            <div className="bg-slate-50 p-6 rounded-3xl inline-block border-2 border-slate-100 shadow-inner mb-8">
              <QRCodeCanvas value={`${ui.basePath}/play/audio`} size={200} level="H" />
            </div>
            <button onClick={() => setUi(p => ({ ...p, showQR: false }))} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition">CLOSE WINDOW</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}