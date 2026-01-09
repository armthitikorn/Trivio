'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'

function VideoArenaContent() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [playerLevel, setPlayerLevel] = useState('Nursery');
  const [isStarted, setIsStarted] = useState(false);
  
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => { 
    fetchQuestions(); 
  }, [targetId]);
  
  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  async function fetchQuestions() {
    try {
      let query = supabase.from('video_questions').select('*');
      if (targetId) query = query.eq('id', targetId);
      const { data, error } = await query;
      if (data) setQuestions(data);
    } catch (err) { console.error(err); }
  }

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: "user" }, 
        audio: true 
      });
      setStream(s);
    } catch (err) { alert("กรุณาเปิดการเข้าถึงกล้องและไมโครโฟนเพื่อความสนุกในการร่วมกิจกรรมครับ"); }
  };

  const getSupportedMimeType = () => {
    const types = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/quicktime'];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = () => {
    setRecordedChunks([]);
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleUpload = async () => {
    if (!fullName || fullName.trim().length < 4) return alert("กรุณาระบุชื่อ-นามสกุลจริงด้วยนะครับ");
    setUploading(true);
    
    try {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunks, { type: mimeType });
      const extension = mimeType.includes('mp4') || mimeType.includes('quicktime') ? 'mp4' : 'webm';
      
      // ✅ ล้างชื่อไฟล์ (ห้ามภาษาไทย) เพื่อป้องกัน Invalid Key
      const safeFileName = `ans_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
      const storagePath = `answers/${safeFileName}`;

      const { error: upError } = await supabase.storage
        .from('video_training')
        .upload(storagePath, blob);

      if (upError) throw upError;

      const { error: insError } = await supabase.from('video_answers').insert([{ 
        question_id: questions[currentIndex].id, 
        nickname: fullName, 
        player_level: playerLevel,
        video_answer_url: storagePath,
        status: 'pending'
      }]);

      if (insError) throw insError;

      alert("🎉 สุดยอด! ผลงานของคุณถูกส่งเข้าระบบเรียบร้อยแล้ว");
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRecordedChunks([]); 
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- UI: Welcome Screen ---
  if (!isStarted) {
    return (
      <div style={styles.pageBackground}>
        <div style={styles.container}>
          <div style={styles.glassCard}>
            <div style={styles.emojiHero}>🚀</div>
            <h1 style={styles.mainTitle}>TRIVIO <span style={{color: '#6366f1'}}>ARENA</span></h1>
            <p style={styles.subTitle}>ปลดล็อกทักษะของคุณผ่านภารกิจวิดีโอ</p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>ชื่อจริง - นามสกุล</label>
              <input 
                style={styles.input} 
                placeholder="กรอกชื่อเพื่อเริ่มภารกิจ..." 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ระดับความท้าทาย</label>
              <select style={styles.select} value={playerLevel} onChange={(e)=>setPlayerLevel(e.target.value)}>
                <option value="Nursery">🍼 Nursery (เริ่มต้น)</option>
                <option value="Rising Star">⭐ Rising Star (ดาวรุ่ง)</option>
                <option value="Legend">🏆 Legend (ตำนาน)</option>
              </select>
            </div>

            <button 
              disabled={!fullName || questions.length === 0} 
              onClick={() => setIsStarted(true)} 
              style={{...styles.primaryBtn, opacity: (!fullName || questions.length === 0) ? 0.6 : 1}}
            >
              {questions.length === 0 ? 'กำลังเตรียมสนาม...' : 'เริ่มภารกิจเลย!'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI: Mission Arena ---
  const currentQuestion = questions[currentIndex];

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* โจทย์ Card */}
        <div style={styles.missionCard}>
          <div style={styles.topHeader}>
            <span style={styles.missionBadge}>MISSION {currentIndex + 1}/{questions.length}</span>
            <span style={styles.levelBadge}>{playerLevel}</span>
          </div>
          <h2 style={styles.questionText}>โจทย์: {currentQuestion?.title}</h2>
          <div style={styles.videoPlayerBox}>
            <video controls playsInline style={styles.fullVideo} 
              src={currentQuestion ? supabase.storage.from('video_training').getPublicUrl(currentQuestion.video_url).data.publicUrl : ''} 
            />
          </div>
        </div>

        {/* การบันทึก Card */}
        <div style={styles.recordingCard}>
          <h3 style={styles.cardTitle}>🤳 บันทึกผลงานของคุณ</h3>
          <div style={{...styles.videoPlayerBox, border: isRecording ? '4px solid #ef4444' : '4px solid #f1f5f9'}}>
            {!stream ? (
              <div style={styles.cameraPlaceholder}>
                <button onClick={startCamera} style={styles.cameraStartBtn}>📸 เปิดกล้อง</button>
              </div>
            ) : (
              <div style={{position:'relative', height:'100%'}}>
                <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.fullVideo, transform:'scaleX(-1)'}} />
                {isRecording && (
                  <div style={styles.recIndicator}>
                    <div style={styles.redDot}></div>
                    <span style={styles.recText}>RECORDING</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={styles.controlRow}>
            {!isRecording ? (
              <button disabled={!stream} onClick={startRecording} style={styles.recordActionBtn}>เริ่มอัดวิดีโอ</button>
            ) : (
              <button onClick={stopRecording} style={styles.stopActionBtn}>⏹️ หยุดบันทึก</button>
            )}
            
            {recordedChunks.length > 0 && !isRecording && (
              <button onClick={handleUpload} disabled={uploading} style={styles.uploadActionBtn}>
                {uploading ? 'กำลังส่ง...' : '📤 ส่งผลงาน'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VideoArena() {
  return (
    <Suspense fallback={<div style={{padding:'100px', textAlign:'center', color:'#fff', fontWeight:'bold'}}>กำลังโหลดสนามทดสอบ...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

// --- Styles: Professional & Fun ---
const styles = {
  pageBackground: { 
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', 
    minHeight: '100vh', 
    padding: '20px 15px',
    fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto'
  },
  container: { maxWidth: '450px', margin: '0 auto' },
  glassCard: { 
    background: 'rgba(255, 255, 255, 0.98)', 
    padding: '35px 25px', 
    borderRadius: '35px', 
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)', 
    textAlign: 'center'
  },
  emojiHero: { fontSize: '4rem', marginBottom: '10px' },
  mainTitle: { fontSize: '2.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '5px', letterSpacing: '-1px' },
  subTitle: { fontSize: '0.95rem', color: '#64748b', marginBottom: '35px' },
  formGroup: { marginBottom: '20px', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#334155', marginBottom: '8px', marginLeft: '5px' },
  input: { width: '100%', padding: '16px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' },
  select: { width: '100%', padding: '16px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '1rem', outline: 'none', background: '#f8fafc' },
  primaryBtn: { width: '100%', padding: '20px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(99,102,241,0.4)' },
  
  missionCard: { background: '#ffffff', padding: '20px', borderRadius: '30px', marginBottom: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' },
  topHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  missionBadge: { background: '#f1f5f9', padding: '6px 15px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900', color: '#475569' },
  levelBadge: { background: '#e0e7ff', padding: '6px 15px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900', color: '#4338ca' },
  questionText: { fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '15px', lineHeight: '1.4' },
  videoPlayerBox: { width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', position: 'relative' },
  fullVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  
  recordingCard: { background: 'rgba(255,255,255,0.95)', padding: '20px', borderRadius: '30px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '900', color: '#1e293b', marginBottom: '15px' },
  cameraPlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cameraStartBtn: { padding: '12px 25px', background: '#fff', color: '#1e293b', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' },
  controlRow: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' },
  recordActionBtn: { padding: '16px 30px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' },
  stopActionBtn: { padding: '16px 30px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold' },
  uploadActionBtn: { padding: '16px 30px', background: '#10b981', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)' },
  recIndicator: { position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '10px' },
  redDot: { width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' },
  recText: { color: 'white', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '1px' }
}