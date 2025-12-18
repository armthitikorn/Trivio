'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function VideoArena() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [fileSize, setFileSize] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const MAX_LIMIT = 10 * 1024 * 1024; // 10MB

  useEffect(() => { fetchQuestions(); }, []);
  
  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.play().catch(console.error);
    }
  }, [stream]);

  useEffect(() => {
    if (fileSize >= MAX_LIMIT && isRecording) {
      stopRecording();
      alert("⚠️ บันทึกครบ 10MB แล้ว ระบบหยุดอัดอัตโนมัติครับ");
    }
  }, [fileSize, isRecording]);

  async function fetchQuestions() {
    const { data } = await supabase.from('video_questions').select('*').eq('is_active', true).order('order_index');
    if (data) setQuestions(data);
  }

  const startCamera = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
    setStream(s);
  };

  const startRecording = () => {
    setRecordedChunks([]);
    setFileSize(0);
    const options = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1000000 };
    const recorder = new MediaRecorder(stream, options);
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
    setUploading(true);
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileName = `ans_${Date.now()}.webm`;
    const { error } = await supabase.storage.from('video_training').upload(`answers/${fileName}`, blob);
    if (!error) {
      await supabase.from('video_answers').insert([{ question_id: questions[currentIndex].id, nickname: localStorage.getItem('nickname') || 'Staff', video_answer_url: `answers/${fileName}` }]);
      alert("ส่งงานสำเร็จ!");
      if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
      setRecordedChunks([]); setFileSize(0);
    }
    setUploading(false);
  };

  if (questions.length === 0) return <div style={styles.pageBackground}>กำลังโหลดโจทย์...</div>;

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <div style={styles.sectionCard}>
          <h3 style={styles.labelHeader}>🎬 โจทย์: {questions[currentIndex].title}</h3>
          <div style={styles.videoFrame}>
            <video controls style={styles.videoElement} src={supabase.storage.from('video_training').getPublicUrl(questions[currentIndex].video_url).data.publicUrl} />
          </div>
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.labelHeader}>🤳 บันทึกคำตอบของคุณ</h3>
          
          {(isRecording || fileSize > 0) && (
            <div style={styles.limitContainer}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:'5px'}}>
                <span>ขนาดไฟล์: {(fileSize / (1024 * 1024)).toFixed(2)} / 10 MB</span>
              </div>
              <div style={styles.progressBg}>
                <div style={{...styles.progressFill, width: `${(fileSize/MAX_LIMIT)*100}%`, background: (fileSize/MAX_LIMIT > 0.8) ? '#ff4757' : '#0984e3' }}></div>
              </div>
            </div>
          )}

          <div style={styles.videoFrame}>
            {!stream ? (
              <div style={styles.placeholder}><button onClick={startCamera} style={styles.actionBtn}>เปิดกล้องตอบโจทย์</button></div>
            ) : (
              <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.videoElement, transform:'scaleX(-1)'}} />
            )}
          </div>
          <div style={{marginTop:'20px', textAlign:'center'}}>
            {!isRecording ? <button onClick={startRecording} style={styles.recordBtn}>เริ่มอัดวิดีโอ</button> : <button onClick={stopRecording} style={styles.stopBtn}>หยุดอัด</button>}
            {recordedChunks.length > 0 && !isRecording && <button onClick={handleUpload} style={styles.saveBtn}>{uploading ? 'กำลังส่ง...' : '📤 ส่งคำตอบนี้'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
const styles = {
  pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '40px 20px' },
  container: { maxWidth: '800px', margin: '0 auto' },
  headerTitle: { fontSize: '2rem', fontWeight: '800', color: '#2d3436', textAlign: 'center', marginBottom: '30px' },
  glassCard: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' },
  sectionCard: { background: '#fff', padding: '20px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '25px' },
  videoFrame: { width: '100%', aspectRatio: '16/9', background: '#1e1e1e', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '5px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  modernInput: { width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #eee', marginBottom: '20px', fontSize: '1.1rem', outline: 'none' },
  placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  recordBtn: { padding: '12px 30px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(255, 71, 87, 0.3)' },
  stopBtn: { padding: '12px 30px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
  saveBtn: { padding: '12px 30px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' },
  actionBtn: { padding: '15px 30px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' },
  overlayStatus: { position: 'absolute', top: '15px', right: '15px' },
  recTag: { background: '#ff4757', color: 'white', padding: '5px 15px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' },
  readyTag: { background: '#2ed573', color: 'white', padding: '5px 15px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' },
  labelHeader: { fontSize: '1rem', color: '#636e72', marginBottom: '15px', fontWeight: 'bold' }
}