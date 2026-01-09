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
  const [playerLevel, setPlayerLevel] = useState('Nursery'); // ✨ ค่าเริ่มต้นคือ Nursery
  const [isStarted, setIsStarted] = useState(false);
  
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const MAX_LIMIT = 10 * 1024 * 1024; // 10MB

  useEffect(() => { 
    fetchQuestions(); 
    const savedName = localStorage.getItem('nickname');
    if (savedName) setNickname(savedName);
  }, [targetId]);
  
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

  async function fetchQuestions() {
    try {
      let query = supabase.from('video_questions').select('*');
      if (targetId) { query = query.eq('id', targetId); } 
      else { query = query.order('created_at', { ascending: false }); }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setQuestions(data);
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  }

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 720, height: 1280, facingMode: "user" }, 
        audio: true 
      });
      setStream(s);
    } catch (err) { alert("เข้าถึงกล้องไม่ได้"); }
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

  const handleUpload = async () => {
    if (!nickname) return alert("กรุณาใส่ชื่อเล่นก่อนส่งงาน");
    setUploading(true);
    
    try {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunks, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `ans_${Date.now()}_${nickname}.${extension}`;

      localStorage.setItem('nickname', nickname);

      const { data: upData, error: upError } = await supabase.storage
        .from('video_training')
        .upload(`answers/${fileName}`, blob);

      if (upError) throw upError;

      // ✨ บันทึกข้อมูลลง Database พร้อม player_level
      const { error: insError } = await supabase.from('video_answers').insert([{ 
        question_id: questions[currentIndex].id, 
        nickname: nickname, 
        player_level: playerLevel, // ✅ ระดับที่พนักงานเลือก
        video_answer_url: upData.path,
        status: 'pending'
      }]);

      if (insError) throw insError;

      alert("🚀 ส่งคำตอบสำเร็จ!");
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRecordedChunks([]); setFileSize(0);
      } else {
        alert("ทำครบทุกโจทย์แล้ว ขอบคุณครับ!");
        window.location.reload();
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // --- UI: หน้าแรก (เลือกชื่อและระดับ) ---
  if (!isStarted) {
    return (
      <div style={styles.pageBackground}>
        <div style={styles.container}>
          <div style={styles.sectionCard}>
            <h2 style={{textAlign:'center', color:'#8e44ad', marginBottom:'20px'}}>🎬 TRIVIO Arena</h2>
            
            <label style={styles.labelInput}>ระบุชื่อเล่น:</label>
            <input 
              style={styles.modernInput} 
              placeholder="ชื่อเล่นของคุณ..." 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
            />

            <label style={styles.labelInput}>เลือกระดับของคุณ (Level):</label>
            <select 
              style={styles.modernInput} 
              value={playerLevel} 
              onChange={(e) => setPlayerLevel(e.target.value)}
            >
              <option value="Nursery">Nursery (ระดับพื้นฐาน)</option>
              <option value="Rising Star">Rising Star (ระดับมาแรง)</option>
              <option value="Legend">Legend (ระดับตำนาน)</option>
            </select>

            <button 
              disabled={!nickname || questions.length === 0} 
              onClick={() => setIsStarted(true)} 
              style={{...styles.actionBtn, width:'100%', marginTop:'10px'}}
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
        <div style={styles.sectionCard}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
             <span style={styles.badge}>โจทย์ที่ {currentIndex + 1}/{questions.length}</span>
             <span style={{...styles.badge, background:'#e8f4fd', color:'#0984e3'}}>ระดับ: {playerLevel}</span>
          </div>
          <h3 style={styles.labelHeader}>📌 หัวข้อ: {currentQuestion?.title}</h3>
          <div style={styles.videoFrame}>
            {questionVideoUrl && <video controls playsInline style={styles.videoElement} src={questionVideoUrl} />}
          </div>
        </div>

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
              <button disabled={!stream} onClick={startRecording} style={styles.recordBtn}>เริ่มอัดวิดีโอ</button>
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

export default function VideoArena() {
  return (
    <Suspense fallback={<div style={{padding:'50px', textAlign:'center'}}>กำลังเตรียมระบบ...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

const styles = {
    pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '20px 10px' },
    container: { maxWidth: '500px', margin: '0 auto' },
    sectionCard: { background: '#fff', padding: '25px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', marginBottom: '20px' },
    videoFrame: { width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden', position: 'relative', border: '3px solid #eee' },
    videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
    modernInput: { width: '100%', padding: '12px 15px', borderRadius: '12px', border: '2px solid #ddd', marginBottom: '15px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: '#fdfdfd' },
    labelInput: { display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '5px', marginLeft: '5px' },
    placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    recordBtn: { padding: '12px 25px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    stopBtn: { padding: '12px 25px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    saveBtn: { padding: '12px 25px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    actionBtn: { padding: '15px 25px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
    labelHeader: { fontSize: '1.1rem', color: '#2d3436', marginBottom: '12px', fontWeight: 'bold' },
    badge: { background: '#f0f0f0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: '#666', fontWeight: 'bold' },
    recTag: { position: 'absolute', top: '10px', left: '10px', background: 'rgba(255, 71, 87, 0.8)', color: 'white', padding: '4px 10px', borderRadius: '5px', fontSize: '0.7rem' }
}