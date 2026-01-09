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
    } catch (err) { alert("กรุณาอนุญาตให้ระบบเข้าถึงกล้องและไมโครโฟน"); }
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
    if (!fullName || fullName.trim().length < 4) return alert("กรุณาระบุชื่อ-นามสกุลจริง");
    setUploading(true);
    
    try {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunks, { type: mimeType });
      const extension = mimeType.includes('mp4') || mimeType.includes('quicktime') ? 'mp4' : 'webm';
      
      // ✅ Sanitize Path สำหรับมือถือ (ห้ามมีช่องว่าง)
      const safeName = fullName.trim().replace(/[^a-zA-Z0-9ก-๙]/g, '_');
      const fileName = `ans_${Date.now()}_${safeName}.${extension}`;
      const storagePath = `answers/${fileName}`;

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

      alert("🚀 บันทึกข้อมูลสำเร็จ! ขอบคุณสำหรับการทดสอบ");
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
            <div style={styles.iconCircle}>🎬</div>
            <h1 style={styles.mainTitle}>TRIVIO ARENA</h1>
            <p style={styles.subTitle}>กรุณาระบุข้อมูลเพื่อเข้าสู่การทดสอบ</p>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>ชื่อจริง - นามสกุล</label>
              <input 
                style={styles.input} 
                placeholder="สมชาย ใจดี" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>ระดับความยาก</label>
              <select style={styles.select} value={playerLevel} onChange={(e)=>setPlayerLevel(e.target.value)}>
                <option value="Nursery">🍼 Nursery (Basic)</option>
                <option value="Rising Star">⭐ Rising Star (Intermediate)</option>
                <option value="Legend">🏆 Legend (Advanced)</option>
              </select>
            </div>

            <button 
              disabled={!fullName || questions.length === 0} 
              onClick={() => setIsStarted(true)} 
              style={{...styles.primaryBtn, marginTop: '20px'}}
            >
              {questions.length === 0 ? 'กำลังเตรียมโจทย์...' : 'เริ่มการทดสอบ'}
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
        <div style={styles.glassCard}>
          <div style={styles.topBar}>
            <span style={styles.badge}>Missions {currentIndex + 1}/{questions.length}</span>
            <span style={styles.levelBadge}>{playerLevel}</span>
          </div>
          <h2 style={styles.questionTitle}>{currentQuestion?.title}</h2>
          <div style={styles.videoWrapper}>
            <video controls playsInline style={styles.videoElement} 
              src={currentQuestion ? supabase.storage.from('video_training').getPublicUrl(currentQuestion.video_url).data.publicUrl : ''} 
            />
          </div>
        </div>

        {/* บันทึกคำตอบ Card */}
        <div style={styles.glassCard}>
          <h3 style={styles.sectionTitle}>🤳 บันทึกคำตอบ</h3>
          <div style={styles.videoWrapper}>
            {!stream ? (
              <div style={styles.placeholder}>
                <button onClick={startCamera} style={styles.cameraBtn}>📸 เปิดกล้อง</button>
              </div>
            ) : (
              <div style={{position:'relative', height:'100%'}}>
                <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.videoElement, transform:'scaleX(-1)'}} />
                {isRecording && <div style={styles.pulseDot}><span style={styles.recText}>REC</span></div>}
              </div>
            )}
          </div>
          
          <div style={styles.btnRow}>
            {!isRecording ? (
              <button disabled={!stream} onClick={startRecording} style={styles.recordBtn}>เริ่มบันทึก</button>
            ) : (
              <button onClick={stopRecording} style={styles.stopBtn}>⏹️ หยุดบันทึก</button>
            )}
            
            {recordedChunks.length > 0 && !isRecording && (
              <button onClick={handleUpload} disabled={uploading} style={styles.uploadBtn}>
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
    <Suspense fallback={<div style={{padding:'100px', textAlign:'center', color:'#666'}}>กำลังโหลด Arena...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

// --- Premium Styles ---
const styles = {
  pageBackground: { 
    background: 'radial-gradient(circle at top right, #6366f1, #a855f7, #ec4899)', 
    minHeight: '100vh', 
    padding: '30px 15px',
    fontFamily: '"Inter", sans-serif'
  },
  container: { maxWidth: '480px', margin: '0 auto' },
  glassCard: { 
    background: 'rgba(255, 255, 255, 0.92)', 
    backdropFilter: 'blur(10px)', 
    padding: '25px', 
    borderRadius: '30px', 
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },
  mainTitle: { fontSize: '2rem', fontWeight: '900', color: '#1e293b', textAlign: 'center', margin: '10px 0 5px' },
  subTitle: { fontSize: '0.9rem', color: '#64748b', textAlign: 'center', marginBottom: '30px' },
  iconCircle: { width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', marginLeft: '5px' },
  input: { width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '1rem', outline: 'none', background: '#fff' },
  primaryBtn: { width: '100%', padding: '18px', background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' },
  
  topBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  badge: { background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' },
  levelBadge: { background: '#e0e7ff', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', color: '#4338ca' },
  questionTitle: { fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '15px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '15px' },
  videoWrapper: { width: '100%', aspectRatio: '16/9', background: '#0f172a', borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { padding: '12px 25px', background: '#fff', color: '#1e293b', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  btnRow: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' },
  recordBtn: { padding: '15px 30px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 8px 15px rgba(239, 68, 68, 0.3)' },
  stopBtn: { padding: '15px 30px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold' },
  uploadBtn: { padding: '15px 30px', background: '#10b981', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 8px 15px rgba(16, 185, 129, 0.3)' },
  pulseDot: { position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '5px' },
  recText: { color: 'white', fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.8)', padding: '3px 8px', borderRadius: '5px' }
}