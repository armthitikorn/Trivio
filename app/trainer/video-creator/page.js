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
  
  const [questions, setQuestions] = useState([])
  const [showQR, setShowQR] = useState(null)
  
  const videoPreviewRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const MAX_LIMIT = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    fetchQuestions();
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

  async function fetchQuestions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('video_questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setQuestions(data);
  }

  // --- ฟังก์ชันลบโจทย์ (Full Version: Storage + DB) ---
  const handleDeleteQuestion = async (q) => {
    const confirmed = confirm(`‼️ ยืนยันการลบโจทย์: "${q.title}"?\nไฟล์วิดีโอและข้อมูลทั้งหมดจะหายไปถาวร`);
    if (!confirmed) return;

    try {
      setUploading(true);
      // 1. ลบไฟล์จาก Storage
      if (q.video_url) {
        const { error: storageError } = await supabase.storage
          .from('video_training')
          .remove([q.video_url]);
        if (storageError) console.error("Storage delete error:", storageError);
      }

      // 2. ลบข้อมูลจาก Database
      const { error: dbError } = await supabase
        .from('video_questions')
        .delete()
        .eq('id', q.id);

      if (dbError) throw dbError;

      alert('🗑️ ลบโจทย์เรียบร้อยแล้ว');
      fetchQuestions(); // รีเฟรชรายการ
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (id) => {
    const shareUrl = `${window.location.origin}/play/video?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('📋 คัดลอกลิงก์เรียบร้อยแล้ว!');
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณา Login ใหม่");
      const fileName = `q_${Date.now()}.webm`;
      const { error: upError } = await supabase.storage
        .from('video_training')
        .upload(`questions/${fileName}`, recordedBlob);
      if (upError) throw upError;

      const { error: insError } = await supabase
        .from('video_questions')
        .insert([{ 
          title, 
          video_url: `questions/${fileName}`, 
          target_segment: targetSegment,
          user_id: user.id 
        }]);

      if (insError) throw insError;
      alert('✅ บันทึกโจทย์สำเร็จ!');
      setTitle(''); setRecordedBlob(null); setFileSize(0);
      fetchQuestions();
    } catch (err) { 
      alert(err.message); 
    } finally { 
      setUploading(false); 
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h1 style={styles.headerTitle}>📽️ Trainer Studio</h1>
        
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

        <h2 style={{...styles.headerTitle, marginTop: '50px', fontSize: '1.5rem'}}>📋 รายการโจทย์ของคุณ</h2>
        
        <div style={styles.listGrid}>
          {questions.map((q) => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/play/video?id=${q.id}`
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`

            return (
              <div key={q.id} style={styles.itemCard}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                   <h4 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#2d3436'}}>{q.title}</h4>
                   <button onClick={() => handleDeleteQuestion(q)} style={styles.deleteBtn}>🗑️</button>
                </div>
                
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  <button onClick={() => copyToClipboard(q.id)} style={styles.smallBtn('#f5f3ff', '#8e44ad', 'flex-1')}>🔗 ลิงก์</button>
                  <button onClick={() => setShowQR(showQR === q.id ? null : q.id)} style={styles.smallBtn('#f1f3f5', '#444', 'flex-1')}>📱 QR Code</button>
                </div>

                {showQR === q.id && (
                  <div style={styles.qrContainer}>
                    <img src={qrUrl} alt="QR Code" style={{width: '120px'}} />
                    <p style={{fontSize: '0.65rem', color: '#999', marginTop: '5px'}}>ให้พนักงานสแกนเพื่อเริ่มฝึก</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {questions.length === 0 && <div style={styles.emptyText}>ยังไม่มีโจทย์ที่สร้างไว้</div>}
      </div>
    </div>
  )
}

const styles = {
  pageBackground: { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: '20px 10px', boxSizing: 'border-box' },
  container: { width: '95%', maxWidth: '900px', margin: '0 auto' },
  headerTitle: { fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '800', color: '#2d3436', textAlign: 'center', marginBottom: '20px' },
  glassCard: { background: 'rgba(255, 255, 255, 0.95)', padding: 'clamp(15px, 4vw, 30px)', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' },
  videoFrame: { width: '100%', aspectRatio: '16/9', background: '#1e1e1e', borderRadius: '18px', overflow: 'hidden', position: 'relative', border: '3px solid #fff' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  modernInput: { width: '100%', padding: '12px 15px', borderRadius: '12px', border: '2px solid #eee', marginBottom: '15px', fontSize: '1rem', boxSizing: 'border-box' },
  placeholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  controlArea: { marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' },
  recordBtn: { padding: '12px 25px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
  stopBtn: { padding: '12px 25px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer' },
  saveBtn: { padding: '12px 25px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' },
  actionBtn: { width: '80%', padding: '15px', background: '#0984e3', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold' },
  limitContainer: { marginBottom: '15px' },
  progressBg: { width: '100%', height: '6px', background: '#eee', borderRadius: '10px' },
  progressFill: { height: '100%', transition: 'width 0.3s ease' },
  overlayStatus: { position: 'absolute', top: '10px', right: '10px' },
  recTag: { background: '#ff4757', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem' },
  readyTag: { background: '#2ed573', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem' },
  
  // Grid ปรับตามจอ
  listGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '25px' },
  itemCard: { background: '#fff', padding: '20px', borderRadius: '22px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  qrContainer: { marginTop: '15px', textAlign: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '15px' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: '20px' },
  
  deleteBtn: { background: '#fff0f0', color: '#ff4757', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '1.1rem', transition: '0.2s' },
  smallBtn: (bg, color, flex) => ({ 
    flex: flex === 'flex-1' ? 1 : 'none',
    padding: '10px', 
    background: bg, 
    color: color, 
    border: 'none', 
    borderRadius: '10px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '0.85rem'
  })
}