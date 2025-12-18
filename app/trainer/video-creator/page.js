'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function VideoCreator() {
  const [title, setTitle] = useState('')
  const [targetSegment, setTargetSegment] = useState('Nursery')
  const [uploading, setUploading] = useState(false)
  const [stream, setStream] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [fileSize, setFileSize] = useState(0)
  
  // --- เพิ่ม State สำหรับจัดการรายการโจทย์ ---
  const [questions, setQuestions] = useState([])
  const [showQR, setShowQR] = useState(null)
  
  const videoPreviewRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const MAX_LIMIT = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    fetchQuestions(); // ดึงข้อมูลเมื่อเปิดหน้าเว็บ
  }, []);

  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.play().catch(console.error);
    }
  }, [stream]);

  useEffect(() => {
    if (fileSize >= MAX_LIMIT && recording) {
      stopRecording();
      alert("⚠️ บันทึกครบ 10MB แล้ว ระบบหยุดอัดอัตโนมัติครับ");
    }
  }, [fileSize, recording]);

  // ดึงข้อมูลโจทย์ทั้งหมดจากฐานข้อมูล
  async function fetchQuestions() {
    const { data } = await supabase.from('video_questions').select('*').order('created_at', { ascending: false });
    if (data) setQuestions(data);
  }

  // ฟังก์ชันคัดลอกลิงก์ (ชี้ไปที่ /play/video)
  const copyToClipboard = (id) => {
    const shareUrl = `${window.location.origin}/play/video?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('📋 คัดลอกลิงก์สำหรับพนักงานเรียบร้อยแล้ว!');
  }

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true 
      });
      setStream(s);
    } catch (err) { alert("เข้าถึงกล้องไม่ได้"); }
  };

  const startRecording = () => {
    setRecordedBlob(null);
    setFileSize(0);
    const options = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1000000 };
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        setFileSize(prev => prev + e.data.size);
      }
    };
    recorder.onstop = () => setRecordedBlob(new Blob(chunks, { type: 'video/webm' }));
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleSave = async () => {
    if (!title || !recordedBlob) return alert('กรุณาระบุชื่อโจทย์');
    setUploading(true);
    const fileName = `q_${Date.now()}.webm`;
    try {
      const { error: upError } = await supabase.storage.from('video_training').upload(`questions/${fileName}`, recordedBlob);
      if (upError) throw upError;
      await supabase.from('video_questions').insert([{ title, video_url: `questions/${fileName}`, target_segment: targetSegment }]);
      alert('✅ บันทึกโจทย์สำเร็จ!');
      setTitle(''); setRecordedBlob(null); setFileSize(0);
      fetchQuestions(); // รีเฟรชรายการโจทย์ด้านล่างทันที
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h1 style={styles.headerTitle}>📽️ Trainer Studio</h1>
        
        {/* --- โซนสร้างโจทย์เดิมของคุณ --- */}
        <div style={styles.glassCard}>
          <input placeholder="ระบุหัวข้อโจทย์ฝึกฝน..." value={title} onChange={e=>setTitle(e.target.value)} style={styles.modernInput} />
          
          {(recording || fileSize > 0) && (
            <div style={styles.limitContainer}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:'5px'}}>
                <span>ขนาดไฟล์: {(fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                <span>Limit: 10 MB</span>
              </div>
              <div style={styles.progressBg}>
                <div style={{...styles.progressFill, width: `${(fileSize/MAX_LIMIT)*100}%`, background: (fileSize/MAX_LIMIT > 0.8) ? '#ff4757' : '#2ed573' }}></div>
              </div>
            </div>
          )}

          <div style={styles.videoFrame}>
            {!stream ? (
              <div style={styles.placeholder}><button onClick={startCamera} style={styles.actionBtn}>📸 เปิดกล้อง</button></div>
            ) : (
              <div style={{position:'relative', height:'100%'}}>
                <video ref={videoPreviewRef} autoPlay muted playsInline style={styles.videoElement} />
                <div style={styles.overlayStatus}>
                  {recording ? <span style={styles.recTag}>● REC</span> : <span style={styles.readyTag}>READY</span>}
                </div>
              </div>
            )}
          </div>

          <div style={styles.controlArea}>
            {stream && (
              <>
                {!recording ? <button onClick={startRecording} style={styles.recordBtn}>เริ่มอัดวิดีโอ</button> : <button onClick={stopRecording} style={styles.stopBtn}>หยุดบันทึก</button>}
                {recordedBlob && !recording && <button onClick={handleSave} disabled={uploading} style={styles.saveBtn}>{uploading ? 'กำลังบันทึก...' : '🚀 อัปโหลดโจทย์'}</button>}
              </>
            )}
          </div>
        </div>

        {/* --- ส่วนที่เพิ่มใหม่: รายการโจทย์และการแชร์ลิงก์ --- */}
        <h2 style={{...styles.headerTitle, marginTop: '50px', fontSize: '1.5rem'}}>📋 รายการโจทย์ที่สร้างแล้ว</h2>
        <div style={styles.listGrid}>
          {questions.map((q) => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/play/video?id=${q.id}`
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`

            return (
              <div key={q.id} style={styles.itemCard}>
                <h4 style={{margin: '0 0 10px 0'}}>{q.title}</h4>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={() => copyToClipboard(q.id)} style={styles.smallBtn('#f5f3ff', '#8e44ad')}>🔗 ลิงก์</button>
                  <button onClick={() => setShowQR(showQR === q.id ? null : q.id)} style={styles.smallBtn('#f1f3f5', '#444')}>📱 QR</button>
                </div>
                {showQR === q.id && (
                  <div style={{marginTop: '15px', textAlign: 'center', background: '#fff', padding: '10px', borderRadius: '15px'}}>
                    <img src={qrUrl} alt="QR Code" />
                    <p style={{fontSize: '0.6rem', color: '#999'}}>แชร์ให้พนักงานสแกน</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- รวม Styles ทั้งหมด ---
const styles = {
  pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '40px 20px' },
  container: { maxWidth: '800px', margin: '0 auto' },
  headerTitle: { fontSize: '2rem', fontWeight: '800', color: '#2d3436', textAlign: 'center', marginBottom: '30px' },
  glassCard: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' },
  videoFrame: { width: '100%', aspectRatio: '16/9', background: '#1e1e1e', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '5px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  modernInput: { width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #eee', marginBottom: '20px', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box' },
  placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  controlArea: { marginTop: '20px', textAlign: 'center' },
  recordBtn: { padding: '12px 30px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
  stopBtn: { padding: '12px 30px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
  saveBtn: { padding: '12px 30px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' },
  actionBtn: { padding: '15px 30px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' },
  limitContainer: { marginBottom: '15px', padding: '0 5px' },
  progressBg: { width: '100%', height: '8px', background: '#eee', borderRadius: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', transition: 'width 0.3s ease' },
  overlayStatus: { position: 'absolute', top: '15px', right: '15px' },
  recTag: { background: '#ff4757', color: 'white', padding: '5px 15px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' },
  readyTag: { background: '#2ed573', color: 'white', padding: '5px 15px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' },
  
  // Styles สำหรับรายการด้านล่าง
  listGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  itemCard: { background: 'rgba(255,255,255,0.7)', padding: '20px', borderRadius: '20px', border: '1px solid #fff' },
  smallBtn: (bg, color) => ({ flex: 1, padding: '10px', background: bg, color: color, border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' })
}