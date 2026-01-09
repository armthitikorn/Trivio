'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'

// --- ส่วนเนื้อหาหลัก ---
function VideoArenaContent() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  // State Management
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

  // โหลดข้อมูลโจทย์
  useEffect(() => { 
    fetchQuestions(); 
  }, [targetId]);
  
  // จัดการการแสดงผลกล้อง
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
    } catch (err) { console.error("Fetch Error:", err); }
  }

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: "user" }, 
        audio: true 
      });
      setStream(s);
    } catch (err) { alert("กรุณาอนุญาตให้ระบบเข้าถึงกล้องและไมโครโฟนเพื่อทำภารกิจ"); }
  };

  // เช็ค Format วิดีโอที่มือถือรองรับ (iOS/Android)
  const getSupportedMimeType = () => {
    const types = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/quicktime'];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = () => {
    setRecordedChunks([]);
    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, options);
    
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

  // ฟังก์ชันอัปโหลด (แก้ไขเพื่อป้องกัน Invalid Key ภาษาไทย)
  const handleUpload = async () => {
    if (!fullName || fullName.trim().length < 4) return alert("กรุณาระบุชื่อจริง และนามสกุล ให้ครบถ้วน");
    setUploading(true);
    
    try {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunks, { type: mimeType });
      const extension = mimeType.includes('mp4') || mimeType.includes('quicktime') ? 'mp4' : 'webm';
      
      // ✅ แก้ไข: ใช้ชื่อไฟล์เป็นภาษาอังกฤษและตัวเลขเท่านั้น เพื่อป้องกัน Error ในมือถือ
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const fileName = `ans_${Date.now()}_${randomId}.${extension}`;
      const storagePath = `answers/${fileName}`;

      // 1. ส่งไฟล์ไปยัง Storage
      const { error: upError } = await supabase.storage
        .from('video_training')
        .upload(storagePath, blob);

      if (upError) throw new Error(`ไม่สามารถอัปโหลดไฟล์ได้: ${upError.message}`);

      // 2. บันทึกประวัติลง Database (ชื่อจริงภาษาไทยจะถูกเก็บที่นี่อย่างปลอดภัย)
      const { error: insError } = await supabase.from('video_answers').insert([{ 
        question_id: questions[currentIndex].id, 
        nickname: fullName, 
        player_level: playerLevel,
        video_answer_url: storagePath,
        status: 'pending'
      }]);

      if (insError) throw insError;

      alert("🚀 ยอดเยี่ยม! ส่งผลงานเรียบร้อยแล้ว");
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRecordedChunks([]); 
      } else {
        alert("คุณทำภารกิจครบถ้วนแล้ว ขอบคุณครับ!");
        window.location.reload();
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- UI หน้าแรก: ยืนยันตัวตน ---
  if (!isStarted) {
    return (
      <div style={styles.pageBackground}>
        <div style={styles.container}>
          <div style={styles.glassCard}>
            <div style={styles.iconCircle}>⭐</div>
            <h1 style={styles.mainTitle}>TRIVIO ARENA</h1>
            <p style={styles.subTitle}>ยินดีต้อนรับเข้าสู่ระบบการทดสอบทักษะ</p>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>ชื่อจริง - นามสกุล</label>
              <input 
                style={styles.input} 
                placeholder="กรอกชื่อและนามสกุลของคุณ" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>เลือกระดับความท้าทาย</label>
              <select style={styles.select} value={playerLevel} onChange={(e)=>setPlayerLevel(e.target.value)}>
                <option value="Nursery">🍼 Nursery (ระดับพื้นฐาน)</option>
                <option value="Rising Star">✨ Rising Star (ระดับดาวรุ่ง)</option>
                <option value="Legend">🏆 Legend (ระดับตำนาน)</option>
              </select>
            </div>

            <button 
              disabled={!fullName || questions.length === 0} 
              onClick={() => setIsStarted(true)} 
              style={{...styles.primaryBtn, marginTop: '15px'}}
            >
              {questions.length === 0 ? 'กำลังเตรียมโจทย์...' : 'เข้าสู่สนามทดสอบ'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI หน้าทดสอบ: Mission Arena ---
  const currentQuestion = questions[currentIndex];

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* โจทย์ Section */}
        <div style={styles.glassCard}>
          <div style={styles.topBar}>
            <span style={styles.badge}>ภารกิจ {currentIndex + 1}/{questions.length}</span>
            <span style={styles.levelBadge}>{playerLevel}</span>
          </div>
          <h2 style={styles.questionTitle}>📌 โจทย์: {currentQuestion?.title}</h2>
          <div style={styles.videoWrapper}>
            <video 
              controls 
              playsInline 
              style={styles.videoElement} 
              src={currentQuestion ? supabase.storage.from('video_training').getPublicUrl(currentQuestion.video_url).data.publicUrl : ''} 
            />
          </div>
        </div>

        {/* การบันทึก Section */}
        <div style={styles.glassCard}>
          <h3 style={styles.sectionTitle}>🤳 พื้นที่บันทึกคำตอบ</h3>
          <div style={styles.videoWrapper}>
            {!stream ? (
              <div style={styles.placeholder}>
                <button onClick={startCamera} style={styles.cameraBtn}>📸 เปิดกล้องของคุณ</button>
              </div>
            ) : (
              <div style={{position:'relative', height:'100%'}}>
                <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.videoElement, transform:'scaleX(-1)'}} />
                {isRecording && (
                  <div style={styles.pulseDot}>
                    <div style={styles.redDot}></div>
                    <span style={styles.recText}>RECORDING</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={styles.btnRow}>
            {!isRecording ? (
              <button disabled={!stream} onClick={startRecording} style={styles.recordBtn}>เริ่มบันทึก</button>
            ) : (
              <button onClick={stopRecording} style={styles.stopBtn}>⏹️ หยุดอัด</button>
            )}
            
            {recordedChunks.length > 0 && !isRecording && (
              <button onClick={handleUpload} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? 'กำลังส่งงาน...' : '📤 ส่งคำตอบ'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ฟังก์ชันหลักที่ส่งออก
export default function VideoArena() {
  return (
    <Suspense fallback={<div style={{padding:'100px', textAlign:'center', color:'#fff'}}>กำลังเตรียมความพร้อม...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

// --- การออกแบบหน้าตาเว็บ (Professional Styles) ---
const styles = {
  pageBackground: { 
    background: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)', 
    minHeight: '100vh', 
    padding: '30px 15px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  container: { maxWidth: '480px', margin: '0 auto' },
  glassCard: { 
    background: 'rgba(255, 255, 255, 0.96)', 
    backdropFilter: 'blur(20px)', 
    padding: '25px', 
    borderRadius: '28px', 
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', 
    marginBottom: '25px',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  mainTitle: { fontSize: '1.8rem', fontWeight: '900', color: '#1e1b4b', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.025em' },
  subTitle: { fontSize: '0.9rem', color: '#64748b', textAlign: 'center', marginBottom: '32px' },
  iconCircle: { width: '56px', height: '56px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' },
  inputGroup: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px', marginLeft: '4px' },
  input: { width: '100%', padding: '16px', borderRadius: '16px', border: '1.5px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' },
  select: { width: '100%', padding: '16px', borderRadius: '16px', border: '1.5px solid #e2e8f0', fontSize: '1rem', outline: 'none', background: '#f8fafc', appearance: 'none' },
  primaryBtn: { width: '100%', padding: '18px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s ease' },
  
  topBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  badge: { background: '#f1f5f9', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', color: '#475569' },
  levelBadge: { background: '#dcfce7', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', color: '#15803d' },
  questionTitle: { fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px', lineHeight: '1.4' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' },
  videoWrapper: { width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { padding: '12px 24px', background: 'rgba(255,255,255,0.9)', color: '#1e293b', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem' },
  btnRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' },
  recordBtn: { padding: '16px 32px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)' },
  stopBtn: { padding: '16px 32px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.95rem' },
  uploadBtn: { padding: '16px 32px', background: '#059669', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' },
  pulseDot: { position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '8px' },
  redDot: { width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' },
  recText: { color: 'white', fontSize: '0.65rem', fontWeight: '900' }
}