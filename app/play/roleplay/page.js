'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://wzwyotzzxycqfwercakh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6d3lvdHp6eHljcWZ3ZXJjakh.lgiAf9oBUqsaWGb3u_80wuoKAODQHE_lIBxpGumhrno';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function FullSimulatorPage() {
    const [isClient, setIsClient] = useState(false);
    const [view, setView] = useState('setup'); // setup, difficulty, s1, s1_5, s2, s3, s4, s5, result
    const [loading, setLoading] = useState(false);
    
    // Logic States
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [difficulty, setDifficulty] = useState('Normal');
    const [questions, setQuestions] = useState({ s2: [], s3: [], s4: [], s5: [] });
    const [currentRound, setCurrentRound] = useState(0); // 1 - 10
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordedParts, setRecordedParts] = useState({});

    // Refs
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const allData = useRef([]);
    const sessionId = useRef(uuidv4());
    const customerAudio = useRef(null);

    useEffect(() => {
        setIsClient(true);
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data, error } = await supabase.from('script_questions').select('*');
        if (!error) {
            const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
            setQuestions({
                s2: shuffle(data.filter(q => q.section === 'questioning')).slice(0, 10), // 10 เทิร์นตามที่คุณระบุ
                s3: shuffle(data.filter(q => q.section === 'objection')).slice(0, 3),
                s4: shuffle(data.filter(q => q.section === 'inquiry')).slice(0, 3),
                s5: shuffle(data.filter(q => q.section === 'closing')).slice(0, 1)
            });
        }
    };

    // ฟังก์ชันเล่นเสียงลูกค้า (Auto-play)
    const playVoice = (url, callback) => {
        if (!url) return callback?.();
        setIsPlaying(true);
        const audio = new Audio(url);
        customerAudio.current = audio;
        audio.play();
        audio.onended = () => {
            setIsPlaying(false);
            if (callback) callback();
        };
    };

    const toggleRecording = async (typeId, label, qText, nextView = null) => {
        if (!isRecording) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
            mediaRecorder.current.start();
            setIsRecording(true);
        } else {
            mediaRecorder.current.stop();
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                allData.current.push({ blob, label, qText });
                setIsRecording(false);
                setRecordedParts(prev => ({ ...prev, [typeId]: true }));
                if (nextView) setView(nextView);
            };
            mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
        }
    };

    const handleNextRound = () => {
        if (currentRound < 9) {
            setCurrentRound(prev => prev + 1);
            setRecordedParts(prev => ({ ...prev, 2: false }));
        } else {
            setView('s3');
        }
    };

    const uploadFinal = async () => {
        setLoading(true);
        try {
            for (const item of allData.current) {
                const fileName = `${sessionId.current}/${item.label}.webm`;
                await supabase.storage.from('responses').upload(fileName, item.blob);
                const { data: { publicUrl } } = supabase.storage.from('responses').getPublicUrl(fileName);
                await supabase.from('submissions').insert([{
                    user_id: sessionId.current,
                    name: userData.name,
                    email: userData.email,
                    difficulty: difficulty,
                    section_label: item.label,
                    question_text: item.qText,
                    audio_url: publicUrl
                }]);
            }
            setView('result');
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    if (!isClient) return null;

    return (
        <div className="simulator-wrapper">
            <style jsx global>{`
                .btn-dif { width: 100px; margin: 5px; }
                .active-dif { border: 3px solid #d9534f !important; font-weight: bold; }
                .status-badge { padding: 5px 15px; border-radius: 20px; background: #eee; font-size: 0.9rem; }
            `}</style>

            <div className="container-box">
                {/* 1. Setup Phase */}
                {view === 'setup' && (
                    <div>
                        <h1>E-Simulator Roleplay</h1>
                        <input className="form-control mb-2 text-center" placeholder="ชื่อ-นามสกุล" 
                               onChange={e => setUserData({...userData, name: e.target.value})} />
                        <input className="form-control mb-3 text-center" placeholder="อีเมล" 
                               onChange={e => setUserData({...userData, email: e.target.value})} />
                        <button className="btn btn-danger w-100" onClick={() => setView('difficulty')}>ต่อไป</button>
                    </div>
                )}

                {/* 2. Difficulty Phase (หัวใจของความยากง่าย) */}
                {view === 'difficulty' && (
                    <div>
                        <h3>เลือกระดับความยาก</h3>
                        <div className="d-flex justify-content-center my-4">
                            {['Easy', 'Normal', 'Hard'].map(d => (
                                <button key={d} className={`btn btn-outline-primary btn-dif ${difficulty === d ? 'active-dif' : ''}`}
                                        onClick={() => setDifficulty(d)}>{d}</button>
                            ))}
                        </div>
                        <button className="btn btn-success" onClick={() => setView('s1')}>เข้าสู่บททดสอบ</button>
                    </div>
                )}

                {/* 3. Section 1: Greeting */}
                {view === 's1' && (
                    <div>
                        <h2>ส่วนที่ 1: การทักทาย</h2>
                        <button className={`btn btn-lg btn-record my-3 ${isRecording ? 'recording' : ''}`}
                                onClick={() => toggleRecording(1, "Greeting", "กล่าวทักทายลูกค้า")}>
                            {isRecording ? '🛑 หยุดบันทึก' : '🎤 เริ่มพูดทักทาย'}
                        </button>
                        {recordedParts[1] && <button className="btn btn-primary d-block mx-auto mt-2" onClick={() => setView('s1_5')}>ไปต่อ</button>}
                    </div>
                )}

                {/* 4. Section 2: 10 Rounds Interaction (เทิร์นการขาย) */}
                {view === 's2' && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="status-badge">ระดับ: {difficulty}</span>
                            <span className="status-badge">รอบที่: {currentRound + 1}/10</span>
                        </div>
                        <div className="question-box shadow-sm mb-4">
                            <h4 className="text-primary">{questions.s2[currentRound]?.question_text}</h4>
                        </div>

                        <button className="btn btn-warning mb-3" disabled={isPlaying}
                                onClick={() => playVoice(questions.s2[currentRound]?.audio_url)}>
                            {isPlaying ? '🔈 ลูกค้ากำลังพูด...' : '▶️ ฟังเสียงลูกค้า'}
                        </button>

                        <div className="mt-2">
                            <button className={`btn btn-record ${isRecording ? 'recording' : ''}`}
                                    disabled={isPlaying}
                                    onClick={() => toggleRecording(2, `S2_Round_${currentRound+1}`, questions.s2[currentRound]?.question_text)}>
                                {isRecording ? '🛑 หยุดบันทึกคำตอบ' : '🎤 ตอบกลับลูกค้า'}
                            </button>
                        </div>

                        {recordedParts[2] && <button className="btn btn-primary mt-4" onClick={handleNextRound}>
                            {currentRound < 9 ? 'รอบถัดไป ➡️' : 'จบส่วนการถามคำถาม'}
                        </button>}
                    </div>
                )}

                {/* ... Section 3, 4, 5 (Objection, Closing) ... */}
                {/* (ในหน้าจริงควรมี UI ครบทุก Section เหมือน s2) */}
                
                {view === 's5' && (
                    <div>
                        <h2>ส่วนสุดท้าย: ปิดการขาย</h2>
                        <div className="question-box mb-4">{questions.s5[0]?.question_text}</div>
                        <button className="btn btn-record" onClick={() => toggleRecording(6, "Closing", "การปิดการขาย", null)}>
                            {isRecording ? '🛑 หยุดบันทึก' : '🎤 กล่าวปิดการขาย'}
                        </button>
                        {recordedParts[6] && <button className="btn btn-success d-block mx-auto mt-3" onClick={uploadFinal}>ส่งผลการทดสอบ</button>}
                    </div>
                )}

                {/* 5. Result Phase */}
                {view === 'result' && (
                    <div className="certificate shadow-lg">
                        <h1 className="text-success">SUCCESS</h1>
                        <hr/>
                        <h4>{userData.name}</h4>
                        <p>ผ่านการจำลองสถานการณ์ระดับ: <strong>{difficulty}</strong></p>
                        <button className="btn btn-outline-secondary mt-3" onClick={() => window.location.reload()}>ทำแบบทดสอบอีกครั้ง</button>
                    </div>
                )}
            </div>
        </div>
    );
}