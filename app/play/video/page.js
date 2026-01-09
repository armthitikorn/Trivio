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
  const [fileSize, setFileSize] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const MAX_LIMIT = 10 * 1024 * 1024; // 10MB

  useEffect(() => { 
    fetchQuestions(); 
    const savedName = localStorage.getItem('nickname');
    if (savedName) setNickname(savedName);
  }, [targetId]); // โหลดใหม่ถ้า ID เปลี่ยน
  
  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (fileSize >= MAX_LIMIT && isRecording) {
      stopRecording();
      alert("⚠️ บันทึกครบ 10MB แล้ว ระบบหยุดอัดอัตโนมัติครับ");
    }
  }, [fileSize, isRecording]);

  // --- 1. ฟังก์ชันดึงโจทย์ที่ปรับปรุงแล้ว ---
  async function fetchQuestions() {
    try {
      let query = supabase.from('video_questions').select('*');
      
      if (targetId) { 
        query = query.eq('id', targetId); 
      } else { 
        query = query.order('created_at', { ascending: false }); 
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setQuestions(data);
        console.log("✅ โหลดโจทย์สำเร็จ:", data);
      } else {
        console.warn("❓ ไม่พบข้อมูลโจทย์");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err.message);
      alert("ไม่สามารถโหลดโจทย์ได้ กรุณาตรวจสอบการเชื่อมต่อ");
    }
  }

  // --- 2. ฟังก์ชันจัดการกล้องและวิดีโอ (รองรับ iOS/Android) ---
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 720, height: 1280, facingMode: "user" }, // ปรับให้เหมาะกับแนวตั้งมือถือ
        audio: true 
      });
      setStream(s);
    } catch (err) { 
      alert("เข้าถึงกล้องไม่ได้: " + err.message); 
    }
  };

  const getSupportedMimeType = () => {
    const types = ['video/webm;codecs=vp8', 'video/mp4', 'video/quicktime'];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = () => {
    setRecordedChunks([]);
    setFileSize(0);
    const mimeType = getSupportedMimeType();
    
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setRecordedChunks(prev => [...prev, e.data]);
        setFileSize(prev => prev + e.data.size);
      }
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // --- 3. ฟังก์ชันส่งงาน ---
  const handleUpload = async () => {
    if (!nickname) return alert("กรุณาใส่ชื่อเล่นก่อนส่งงาน");
    setUploading(true);
    
    try {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunks, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `ans_${Date.now()}_${nickname}.${extension}`;

      // บันทึกลง localStorage ไว้กันพลาด
      localStorage.setItem('nickname', nickname);

      // อัปโหลดไป Storage (Folder: answers)
      const { data: upData, error: upError } = await supabase.storage
        .from('video_training')
        .upload(`answers/${fileName}`, blob);

      if (upError) throw upError;

      // บันทึกลงตาราง video_answers
      const { error: insError } = await supabase.from('video_answers').insert([{ 
        question_id: questions[currentIndex].id, 
        nickname: nickname, 
        video_answer_url: upData.path,
        status: 'pending'
      }]);

      if (insError) throw insError;

      alert("🚀 ส่งคำตอบสำเร็จแล้ว!");
      
      // ถ้ามีโจทย์ถัดไปให้ไปต่อ ถ้าไม่มีให้จบ
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRecordedChunks([]); 
        setFileSize(0);
      } else {
        alert("คุณทำครบทุกโจทย์แล้ว ขอบคุณครับ!");
        window.location.reload(); 
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่ง: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- UI: หน้าแรก (รับชื่อ) ---
  if (!isStarted) {
    return (
      <div style={styles.pageBackground}>
        <div style={styles.container}>
          <div style={styles.sectionCard}>
            <h2 style={{textAlign:'center', color:'#8e44ad', marginBottom:'20px'}}>🎬 Video Training</h2>
            <p style={{textAlign:'center', fontSize:'0.9rem', color:'#666', marginBottom:'20px'}}>ยินดีต้อนรับ! กรุณาระบุชื่อเล่นเพื่อเริ่มทำโจทย์</p>
            <input 
              style={styles.modernInput} 
              placeholder="ชื่อเล่นของคุณ..." 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
            />
            <button 
              disabled={!nickname || questions.length === 0} 
              onClick={() => setIsStarted(true)} 
              style={{...styles.actionBtn, width:'100%', opacity: (!nickname || questions.length === 0) ? 0.6 : 1}}
            >
              {questions.length === 0 ? 'กำลังโหลดโจทย์...' : 'เริ่มภารกิจ'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI: หน้าทำโจทย์ ---
  const currentQuestion = questions[currentIndex];
  const questionVideoUrl = currentQuestion ? supabase.storage.from('video_training').getPublicUrl(currentQuestion.video_url).data.publicUrl : '';

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* ส่วนแสดงโจทย์ */}
        <div style={styles.sectionCard}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
             <span style={styles.badge}>โจทย์ที่ {currentIndex + 1}/{questions.length}</span>
          </div>
          <h3 style={styles.labelHeader}>📌 หัวข้อ: {currentQuestion?.title}</h3>
          <div style={styles.videoFrame}>
            {questionVideoUrl && <video controls playsInline style={styles.videoElement} src={questionVideoUrl} />}
          </div>
        </div>

        {/* ส่วนบันทึกคำตอบ */}
        <div style={styles.sectionCard}>
          <h3 style={styles.labelHeader}>🤳 บันทึกคำตอบของคุณ</h3>
          <div style={styles.videoFrame}>
            {!stream ? (
              <div style={styles.placeholder}>
                <button onClick={startCamera} style={styles.actionBtn}>📸 เปิดกล้องตอบโจทย์</button>
              </div>
            ) : (
              <div style={{position:'relative', height:'100%'}}>
                <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.videoElement, transform:'scaleX(-1)'}} />
                {isRecording && <div style={styles.recTag}>● Recording</div>}
              </div>
            )}
          </div>
          
          <div style={{marginTop:'20px', textAlign:'center', display:'flex', justifyContent:'center', gap:'10px'}}>
            {!isRecording ? (
              <button disabled={!stream} onClick={startRecording} style={{...styles.recordBtn, opacity: !stream ? 0.5 : 1}}>เริ่มอัดวิดีโอ</button>
            ) : (
              <button onClick={stopRecording} style={styles.stopBtn}>⏹️ หยุดอัด</button>
            )}
            
            {recordedChunks.length > 0 && !isRecording && (
              <button onClick={handleUpload} disabled={uploading} style={styles.saveBtn}>
                {uploading ? 'กำลังส่ง...' : '📤 ส่งคำตอบ'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ฟังก์ชันหลักห่อด้วย Suspense เพื่อรองรับ useSearchParams
export default function VideoArena() {
  return (
    <Suspense fallback={<div style={{padding:'50px', color:'#666', textAlign:'center'}}>กำลังเตรียมระบบ...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

const styles = {
    pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '20px 10px' },
    container: { maxWidth: '600px', margin: '0 auto' },
    sectionCard: { background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: '20px' },
    videoFrame: { width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden', position: 'relative', border: '3px solid #eee' },
    videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
    modernInput: { width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #ddd', marginBottom: '15px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' },
    placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    recordBtn: { padding: '12px 25px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    stopBtn: { padding: '12px 25px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    saveBtn: { padding: '12px 25px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    actionBtn: { padding: '15px 25px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
    labelHeader: { fontSize: '1.1rem', color: '#2d3436', marginBottom: '12px', fontWeight: 'bold' },
    badge: { background: '#f0f0f0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#666' },
    recTag: { position: 'absolute', top: '10px', left: '10px', background: 'rgba(255, 71, 87, 0.8)', color: 'white', padding: '4px 10px', borderRadius: '5px', fontSize: '0.7rem' }
}