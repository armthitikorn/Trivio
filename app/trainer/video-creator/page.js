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
  
  const videoPreviewRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const MAX_LIMIT = 10 * 1024 * 1024; // จำกัดที่ 10MB

  useEffect(() => {
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.play().catch(console.error);
    }
  }, [stream]);

  // ระบบหยุดอัตโนมัติเมื่อครบ 10MB
  useEffect(() => {
    if (fileSize >= MAX_LIMIT && recording) {
      stopRecording();
      alert("⚠️ บันทึกครบ 10MB แล้ว ระบบหยุดอัดอัตโนมัติครับ");
    }
  }, [fileSize, recording]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, // ลดความละเอียดเพื่อประหยัดพื้นที่
        audio: true 
      });
      setStream(s);
    } catch (err) { alert("เข้าถึงกล้องไม่ได้"); }
  };

  const startRecording = () => {
    setRecordedBlob(null);
    setFileSize(0);
    const options = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1000000 }; // บีบอัด Bitrate
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        setFileSize(prev => prev + e.data.size);
      }
    };
    recorder.onstop = () => setRecordedBlob(new Blob(chunks, { type: 'video/webm' }));
    recorder.start(1000); // ตรวจสอบขนาดทุกวินาที
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
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h1 style={styles.headerTitle}>📽️ Trainer Studio</h1>
        <div style={styles.glassCard}>
          <input placeholder="ระบุหัวข้อโจทย์ฝึกฝน..." value={title} onChange={e=>setTitle(e.target.value)} style={styles.modernInput} />
          
          {/* หลอดลิมิต 10MB */}
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
              <div style={styles.placeholder}><button onClick={startCamera} style={styles.pulseBtn}>📸 เปิดกล้อง</button></div>
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
  labelHeader: { fontSize: '1rem', color: '#636e72', marginBottom: '15px', fontWeight: 'bold' }
}