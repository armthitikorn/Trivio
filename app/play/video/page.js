'use client'
import { useState, useEffect, useRef, Suspense } from 'react' // ✨ เพิ่ม Suspense ตรงนี้
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'

// 1. แยกเนื้อหาทั้งหมดมาไว้ในฟังก์ชันชื่อ VideoArenaContent
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

  // ... (ก๊อปปี้ฟังก์ชัน useEffect, fetchQuestions, startCamera, startRecording, stopRecording, handleUpload มาทั้งหมดเหมือนเดิม) ...
  useEffect(() => { 
    fetchQuestions(); 
    const savedName = localStorage.getItem('nickname');
    if (savedName) setNickname(savedName);
  }, []);
  
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
    let query = supabase.from('video_questions').select('*').eq('is_active', true);
    if (targetId) { query = query.eq('id', targetId); } 
    else { query = query.order('order_index'); }
    const { data } = await query;
    if (data) setQuestions(data);
  }

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      setStream(s);
    } catch (err) { alert("ไม่สามารถเข้าถึงกล้องได้"); }
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
    if (!nickname) return alert("กรุณาใส่ชื่อเล่นก่อนส่งงาน");
    setUploading(true);
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileName = `ans_${nickname}_${Date.now()}.webm`;
    const { error } = await supabase.storage.from('video_training').upload(`answers/${fileName}`, blob);
    if (!error) {
      await supabase.from('video_answers').insert([{ 
        question_id: questions[currentIndex].id, 
        nickname: nickname, 
        video_answer_url: `answers/${fileName}`,
        status: 'pending'
      }]);
      alert("🚀 ส่งงานสำเร็จ!");
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRecordedChunks([]); setFileSize(0);
      } else { window.location.href = '/play/my-results'; }
    }
    setUploading(false);
  };

  if (!isStarted) {
    return (
      <div style={styles.pageBackground}>
        <div style={styles.container}>
          <div style={styles.sectionCard}>
            <h2 style={{textAlign:'center', color:'#8e44ad'}}>🎬 TRIVIO Video Arena</h2>
            <input style={styles.modernInput} placeholder="ชื่อเล่นของคุณ..." value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <button disabled={!nickname || questions.length === 0} onClick={() => setIsStarted(true)} style={{...styles.actionBtn, width:'100%'}}>เริ่มภารกิจ</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <div style={styles.sectionCard}>
          <h3 style={styles.labelHeader}>🎬 โจทย์: {questions[currentIndex]?.title}</h3>
          <div style={styles.videoFrame}>
            <video controls style={styles.videoElement} src={questions[currentIndex] ? supabase.storage.from('video_training').getPublicUrl(questions[currentIndex].video_url).data.publicUrl : ''} />
          </div>
        </div>
        <div style={styles.sectionCard}>
          <h3 style={styles.labelHeader}>🤳 บันทึกคำตอบ (ผู้ทำ: {nickname})</h3>
          <div style={styles.videoFrame}>
            {!stream ? (
              <div style={styles.placeholder}><button onClick={startCamera} style={styles.actionBtn}>เปิดกล้องตอบโจทย์</button></div>
            ) : (
              <video ref={videoPreviewRef} autoPlay muted playsInline style={{...styles.videoElement, transform:'scaleX(-1)'}} />
            )}
          </div>
          <div style={{marginTop:'20px', textAlign:'center'}}>
            {!isRecording ? <button disabled={!stream} onClick={startRecording} style={styles.recordBtn}>เริ่มอัดวิดีโอ</button> : <button onClick={stopRecording} style={styles.stopBtn}>หยุดอัด</button>}
            {recordedChunks.length > 0 && !isRecording && <button onClick={handleUpload} style={styles.saveBtn}>{uploading ? 'กำลังส่ง...' : '📤 ส่งคำตอบ'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// 2. ฟังก์ชันหลัก Export Default ที่ห่อด้วย Suspense (✨ จุดแก้ Error)
export default function VideoArena() {
  return (
    <Suspense fallback={<div style={{padding:'50px', color:'white', textAlign:'center'}}>กำลังโหลดระบบวิดีโอ...</div>}>
      <VideoArenaContent />
    </Suspense>
  )
}

const styles = {
    // ... (ก๊อปปี้ styles เดิมของคุณมาวางตรงนี้ได้เลยครับ)
    pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '40px 20px' },
    container: { maxWidth: '800px', margin: '0 auto' },
    sectionCard: { background: '#fff', padding: '30px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '25px' },
    videoFrame: { width: '100%', aspectRatio: '16/9', background: '#1e1e1e', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '5px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' },
    videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
    modernInput: { width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #eee', marginBottom: '20px', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box' },
    placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    recordBtn: { padding: '12px 30px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    stopBtn: { padding: '12px 30px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
    saveBtn: { padding: '12px 30px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' },
    actionBtn: { padding: '15px 30px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' },
    labelHeader: { fontSize: '1rem', color: '#636e72', marginBottom: '15px', fontWeight: 'bold' }
}