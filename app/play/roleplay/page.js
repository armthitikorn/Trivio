'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// ✅ Supabase Config จากไฟล์เดิมของคุณ
const supabaseUrl = 'https://wzwyotzzxycqfwercakh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6d3lvdHp6eHljcWZ3ZXJjakh.lgiAf9oBUqsaWGb3u_80wuoKAODQHE_lIBxpGumhrno';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ESimulatorPage() {
    // --- States สำหรับการควบคุมหน้าจอ (แทนการใช้ .style.display) ---
    const [isClient, setIsClient] = useState(false);
    const [view, setView] = useState('setup'); // setup, intro, s1, s1_5, s2, s3, s4, s5, result
    const [loading, setLoading] = useState(false);
    
    // --- Data States ---
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [questions, setQuestions] = useState({ s2: [], s3: [], s4: [], s5: [] });
    const [currentS2Index, setCurrentS2Index] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedParts, setRecordedParts] = useState({}); // เก็บสถานะว่าส่วนไหนอัดแล้วบ้าง
    
    // --- Refs สำหรับ Logic การบันทึกเสียงและข้อมูล ---
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const allData = useRef([]); // เก็บ Blob และข้อมูลคำถามเพื่อ Upload ทีเดียว
    const currentSessionId = useRef(uuidv4());

    // 1. Initialization: ดึงข้อมูลเริ่มต้น
    useEffect(() => {
        setIsClient(true);
        const savedName = localStorage.getItem("lastUsedName") || "";
        const savedEmail = localStorage.getItem("lastUsedEmail") || "";
        setUserData({ name: savedName, email: savedEmail });
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const { data, error } = await supabase.from('script_questions').select('*');
            if (error) throw error;

            // ตรรกะการสุ่ม (Logic เดิม)
            const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
            setQuestions({
                s2: shuffle(data.filter(q => q.section === 'questioning')).slice(0, 5),
                s3: shuffle(data.filter(q => q.section === 'objection')).slice(0, 3),
                s4: shuffle(data.filter(q => q.section === 'inquiry')).slice(0, 3),
                s5: shuffle(data.filter(q => q.section === 'closing')).slice(0, 1)
            });
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    // 2. Recording Logic (Logic เดิม)
    const toggleRecording = async (typeId) => {
        if (!isRecording) {
            // Start
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder.current = new MediaRecorder(stream);
                audioChunks.current = [];
                mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
                
                mediaRecorder.current.onstop = () => {
                    const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                    processRecording(typeId, blob);
                };

                mediaRecorder.current.start();
                setIsRecording(true);
            } catch (err) {
                alert("กรุณาอนุญาตการใช้ไมโครโฟน");
            }
        } else {
            // Stop
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
        }
    };

    const processRecording = (typeId, blob) => {
        let label = "";
        let qText = "";
        
        // แมปข้อมูลตามโครงสร้างเดิม
        if (typeId === 1) { label = "Section1_Greeting"; qText = "บททักทาย"; }
        else if (typeId === 8) { label = "Section1.5_Pitching"; qText = "บท Pitching"; }
        else if (typeId === 2) { label = `Section2_Q${currentS2Index + 1}`; qText = questions.s2[currentS2Index]?.question_text; }
        else if (typeId === 3) { label = "Section3_Objection"; qText = questions.s3.map(q => q.question_text).join(", "); }
        else if (typeId === 4) { label = "Section3_Reply"; qText = "การตอบข้อโต้แย้ง"; }
        else if (typeId === 5) { label = "Section4_Inquiry"; qText = questions.s4.map(q => q.question_text).join(", "); }
        else if (typeId === 7) { label = "Section4_FollowUp"; qText = "การตอบข้อซักถาม"; }
        else if (typeId === 6) { label = "Section5_Closing"; qText = questions.s5[0]?.question_text; }

        allData.current.push({ blob, label, qText });
        setRecordedParts(prev => ({ ...prev, [typeId]: true }));
    };

    // 3. Navigation & Final Upload
    const uploadAll = async () => {
        if (allData.current.length === 0) return alert("ไม่พบข้อมูลเสียง");
        setLoading(true);

        try {
            for (const item of allData.current) {
                const fileName = `${currentSessionId.current}/${item.label}_${Date.now()}.webm`;
                
                // Upload Blob
                const { error: upErr } = await supabase.storage.from('responses').upload(fileName, item.blob);
                if (upErr) throw upErr;

                const { data: { publicUrl } } = supabase.storage.from('responses').getPublicUrl(fileName);

                // Insert Database
                await supabase.from('submissions').insert([{
                    user_id: currentSessionId.current,
                    name: userData.name,
                    email: userData.email,
                    section_label: item.label,
                    question_text: item.qText,
                    audio_url: publicUrl
                }]);
            }
            setView('result');
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isClient) return null;

    return (
        <div className="container-box">
            {/* --- CSS เดิม (ใช้ Template Literal) --- */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap');
                body { font-family: 'Sarabun', sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
                .container-box { max-width: 700px; margin: 0 auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
                h1 { color: #d9534f; }
                .btn-custom { padding: 12px 25px; border-radius: 8px; font-weight: bold; transition: 0.3s; margin: 5px; border: none; }
                .btn-primary-custom { background-color: #337ab7; color: white; }
                .btn-record { background-color: #d9534f; color: white; }
                .recording { animation: pulse 1.5s infinite; background-color: #ff4d4d !important; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                .question-box { background: #f9f9f9; border-left: 5px solid #337ab7; padding: 15px; margin: 20px 0; text-align: left; }
            `}</style>

            {/* --- UI Rendering (เลียนแบบโครงสร้างเดิม) --- */}
            
            {loading && <div className="overlay">กำลังอัปโหลดข้อมูล...</div>}

            {/* Section: Setup */}
            {view === 'setup' && (
                <div>
                    <h1>E-Simulator Roleplay</h1>
                    <div className="mb-3">
                        <input type="text" className="form-control mb-2" placeholder="ชื่อ-นามสกุล" 
                               value={userData.name} onChange={e => {
                                   setUserData({...userData, name: e.target.value});
                                   localStorage.setItem("lastUsedName", e.target.value);
                               }} />
                        <input type="email" className="form-control" placeholder="อีเมล" 
                               value={userData.email} onChange={e => {
                                   setUserData({...userData, email: e.target.value});
                                   localStorage.setItem("lastUsedEmail", e.target.value);
                               }} />
                    </div>
                    <button className="btn-custom btn-primary-custom" 
                            disabled={!userData.name || !userData.email}
                            onClick={() => setView('intro')}>เริ่มต้น</button>
                </div>
            )}

            {/* Section 1: Greeting */}
            {view === 'intro' && (
                <div>
                    <h2>ส่วนที่ 1: การทักทาย</h2>
                    <p>จำลองสถานการณ์: ลูกค้าเพิ่งรับสาย ให้คุณกล่าวคำทักทายตามสคริปต์</p>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(1)}>
                        {isRecording ? 'กำลังอัดเสียง...' : 'กดเพื่อบันทึกเสียงทักทาย'}
                    </button>
                    {recordedParts[1] && <div className="text-success mt-2">✓ บันทึกแล้ว</div>}
                    <br/>
                    <button className="btn-custom btn-primary-custom mt-3" 
                            disabled={!recordedParts[1]} onClick={() => setView('s1_5')}>ต่อไป</button>
                </div>
            )}

            {/* Section 1.5: Pitching */}
            {view === 's1_5' && (
                <div>
                    <h2>ส่วนที่ 1.5: การนำเสนอ (Pitching)</h2>
                    <p>นำเสนอหัวใจสำคัญของประกันใน 30 วินาที</p>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(8)}>
                        {isRecording ? 'กำลังอัดเสียง...' : 'กดเพื่อบันทึก Pitching'}
                    </button>
                    {recordedParts[8] && <div className="text-success mt-2">✓ บันทึกแล้ว</div>}
                    <br/>
                    <button className="btn-custom btn-primary-custom mt-3" 
                            disabled={!recordedParts[8]} onClick={() => setView('s2')}>ต่อไป</button>
                </div>
            )}

            {/* Section 2: Questioning */}
            {view === 's2' && (
                <div>
                    <h2>ส่วนที่ 2: การถามคำถามเพื่อเปิดใจ</h2>
                    <div className="question-box">
                        <strong>คำถามที่ {currentS2Index + 1}:</strong> {questions.s2[currentS2Index]?.question_text}
                    </div>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(2)}>
                        {isRecording ? 'กำลังอัดเสียงตอบ' : 'เริ่มบันทึกคำตอบ'}
                    </button>
                    <br/>
                    {recordedParts[2] && (
                        <button className="btn-custom btn-primary-custom mt-3" onClick={() => {
                            if (currentS2Index < 4) {
                                setCurrentS2Index(prev => prev + 1);
                                setRecordedParts(prev => ({...prev, 2: false})); // รีเซ็ตสถานะเพื่อบันทึกข้อถัดไป
                            } else {
                                setView('s3');
                            }
                        }}>
                            {currentS2Index < 4 ? 'ข้อถัดไป' : 'ไปส่วนถัดไป'}
                        </button>
                    )}
                </div>
            )}

            {/* Section 3: Objection (ย่อเพื่อความสั้น แต่คง Logic เดิม) */}
            {view === 's3' && (
                <div>
                    <h2>ส่วนที่ 3: รับมือข้อโต้แย้ง</h2>
                    <div className="question-box">
                        {questions.s3.map((q, i) => <p key={i}>• {q.question_text}</p>)}
                    </div>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(4)}>
                        {isRecording ? 'กำลังอัดบทตอบโต้แย้ง...' : 'บันทึกวิธีแก้ข้อโต้แย้ง'}
                    </button>
                    <br/>
                    <button className="btn-custom btn-primary-custom mt-3" 
                            disabled={!recordedParts[4]} onClick={() => setView('s4')}>ต่อไป</button>
                </div>
            )}

            {/* Section 4 & 5... (ทำในลักษณะเดียวกัน) */}
            {view === 's4' && (
                <div>
                    <h2>ส่วนที่ 4: การตอบข้อซักถาม</h2>
                    <div className="question-box">
                        {questions.s4.map((q, i) => <p key={i}>• {q.question_text}</p>)}
                    </div>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(7)}>
                        {isRecording ? 'กำลังอัดคำตอบ...' : 'บันทึกคำตอบข้อซักถาม'}
                    </button>
                    <br/>
                    <button className="btn-custom btn-primary-custom mt-3" 
                            disabled={!recordedParts[7]} onClick={() => setView('s5')}>ต่อไป</button>
                </div>
            )}

            {view === 's5' && (
                <div>
                    <h2>ส่วนสุดท้าย: การปิดการขาย</h2>
                    <div className="question-box">
                        {questions.s5[0]?.question_text}
                    </div>
                    <button className={`btn-custom btn-record ${isRecording ? 'recording' : ''}`}
                            onClick={() => toggleRecording(6)}>
                        {isRecording ? 'กำลังอัดเสียง...' : 'บันทึกคำกล่าวปิดการขาย'}
                    </button>
                    <br/>
                    <button className="btn-custom btn-primary-custom mt-3" 
                            disabled={!recordedParts[6]} onClick={uploadAll}>ส่งข้อมูลและดูใบประกาศ</button>
                </div>
            )}

            {/* Result / Certificate */}
            {view === 'result' && (
                <div id="certificate">
                    <h1 className="text-success">ยินดีด้วย!</h1>
                    <div style={{border: '10px solid #d9534f', padding: '40px', marginTop: '20px'}}>
                        <h2>ใบประกาศนียบัตรความสำเร็จ</h2>
                        <p>ขอมอบให้แก่</p>
                        <h3>{userData.name}</h3>
                        <p>ผ่านการทดสอบ E-Simulator Roleplay (Final Fixed)</p>
                        <small>Session ID: {currentSessionId.current}</small>
                    </div>
                    <button className="btn-custom btn-primary-custom mt-4" onClick={() => window.location.reload()}>เริ่มใหม่</button>
                </div>
            )}
        </div>
    );
}