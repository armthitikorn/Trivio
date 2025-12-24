'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// ✅ Supabase Config (ใช้ค่าเดิมจากไฟล์ของคุณ)
const supabaseUrl = 'https://wzwyotzzxycqfwercakh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6d3lvdHp6eHljcWZ3ZXJjakh.lgiAf9oBUqsaWGb3u_80wuoKAODQHE_lIBxpGumhrno';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function RoleplayPage() {
    // --- States ---
    const [isClient, setIsClient] = useState(false);
    const [currentPart, setCurrentPart] = useState('part1');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);

    // --- Refs (สำหรับ Logic ที่ไม่ต้อง Re-render) ---
    const audioBlobs = useRef({ part1: {}, part2: {}, part3: {} });
    const mediaRecorder = useRef(null);
    const audioStream = useRef(null);
    const currentAudioChunk = useRef([]);
    const currentUserId = useRef(null);
    const partCompletion = useRef({ part1: false, part2: false, part3: false });

    const USER_ID_KEY = 'roleplay_user_id';
    const USER_NAME_KEY = 'roleplay_user_name';

    // ✅ รายการคำถามทั้งหมดจากต้นฉบับ
    const allQuestions = {
        part1: ["ขอโทษครับ/ค่ะ ไม่สนใจต้นสาย", "ไม่สะดวกคุยตอนนี้ครับ/ค่ะ", "ไม่รับสายขายของครับ/ค่ะ", "ไม่สนใจประกันครับ/ค่ะ", "มีประกันอยู่แล้วครับ/ค่ะ", "ไม่อยากเสียเวลา", "ไม่เคยซื้อของทางโทรศัพท์", "ไม่ไว้ใจการขายทางโทรศัพท์", "ไม่อยากให้ข้อมูลส่วนตัว", "ไม่สนใจเรื่องสุขภาพตอนนี้", "ไม่สะดวกทำงานอยู่", "ไม่สะดวกขับรถอยู่", "ไม่สะดวกคุยช่วงเช้า", "ไม่สะดวกโทรมาบ่อยมาก", "ไม่สะดวก ไม่ฟัง", "ประกันมีเยอะแล้ว", "ใครให้เบอร์โทรมาติดต่อ", "ยกเลิกบัตรเครดิตไปแล้ว", "ไม่ชอบประกันชีวิต", "ยกเลิกไปหมดแล้ว", "มิจฉาชีพหรือป่าว"],
        part2: ["ประกันสุขภาพครอบคลุมโรคเรื้อรังหรือไม่?", "ถ้าเข้าโรงพยาบาลเอกชนจะจ่ายเต็มไหม?", "มีค่าห้องสูงสุดเท่าไหร่?", "ต้องสำรองจ่ายก่อนหรือไม่?", "มีเงื่อนไขการเคลมอะไรบ้าง?", "ถ้าเป็นโรคที่มีมาก่อนจะคุ้มครองไหม?", "มีระยะเวลารอคอยหรือไม่?", "เบี้ยประกันปรับขึ้นทุกปีหรือไม่?", "สามารถใช้ร่วมกับสิทธิ์ประกันสังคมได้ไหม?", "มีวงเงินคุ้มครองสูงสุดเท่าไหร่?", "ถ้าไม่ได้ใช้บริการเลย จะได้เงินคืนไหม?", "มีบริการเคลมออนไลน์หรือไม่?", "สามารถเลือกโรงพยาบาลเองได้ไหม?", "มีคุ้มครองกรณีอุบัติเหตุหรือไม่?", "ถ้าเปลี่ยนงานจะยังใช้ประกันได้ไหม?", "มีคุ้มครองกรณีโรคร้ายแรงหรือไม่?", "สามารถซื้อให้ครอบครัวได้ไหม?", "มีบริการช่วยเหลือฉุกเฉินหรือไม่?", "มีเงื่อนไขการยกเลิกกรมธรรมณ์อย่างไร?", "สามารถจ่ายเบี้ยผ่านบัตรเครดิตได้ไหม?", "ข้อมูลเยอะจัง ส่งเอกสารให้ดูก่อนได้มัย", "เหมือนที่มีอยู่ เหมือนๆกันเลย", "ความคุ้มครองน้อยจัง ไม่ตอบโจทย์", "ค่าเบี้ยแพงจัง", "ไม่อยากได้แบบนี้ อยากได้แบบอื่น", "ขอปรึกษาพ่อ แม่ แฟน ดูก่อน", "ช่วงนี้ค่าใช้จ่ายเยอะ", "ขอคิดดูก่อน", "กลัวซ้ำซ้อน เบิกเคลมไม่ได้", "มีเยอะแล้ว แค่ฟังๆดูก่อน", "ทำแล้วติดต่อยาก ไม่รู้จะปรึกษาใครเวลามีปัญหาในกรมธรรมณ์", "ที่พูดมาได้จริงหรอ", "ไม่มั่นใจในบริษัท ไม่ชอบซื้อผ่านโทรศัพท์", "ได้กำไรน้อย ขาดทุน กว่าจะได้จุดคุ้มทุน", "ซื้อไปก็ไม่ได้ใช้", "เดียวๆ ต้องทำงานต่อก่อน", "ฟังแล้วไม่น่าสนใจเลย", "มีประกันสังคม ประกันกลุ่มบริษัทอยู่แล้ว", "หักลดหย่อนภาษีเต็ม", "ที่บ้านเป็นตัวแทน", "ซื้อไว้หมดทุกตัวแล้ว"],
        part3: ["คิดว่าแพงเกินไปครับ/ค่ะ", "ขอคิดดูก่อนครับ/ค่ะ", "ต้องปรึกษาครอบครัวก่อนครับ/ค่ะ", "ยังไม่พร้อมตัดสินใจครับ/ค่ะ", "ไม่มั่นใจในบริษัทครับ/ค่ะ", "กลัวถูกหลอกครับ/ค่ะ", "มีประกันอยู่แล้วครับ/ค่ะ", "ไม่เห็นความจำเป็นครับ/ค่ะ", "ไม่อยากผูกมัดระยะยาวครับ/ค่ะ", "ไม่มั่นใจว่าจะได้ใช้ครับ/ค่ะ", "ยังๆ ยังไม่ทำนะ", "ขอดูวงเงินบัตรเครดิตก่อน รอบตัดบัตรเครดิตไม่สะดวก", "ต้องทำเลยหรอ", "คิดดูก่อนสักวัน 2วันได้มัย", "ขอเปรียบเทียบกับกรมธรรมณ์เก่าก่อนนะ", "ยังไม่ให้คำตอบวันนี้", "โยนให้คนอื่นตัดสิ้นใจแทน เช่น แฟน", "รอเงินเดือนออกก่อน"]
    };

    const shuffle = (array) => {
        let copy = [...array];
        let selected = [];
        while (selected.length < 10 && copy.length > 0) {
            const index = Math.floor(Math.random() * copy.length);
            selected.push(copy.splice(index, 1)[0]);
        }
        return selected;
    };

    const loadPart = (part) => {
        setCurrentPart(part);
        setShuffledQuestions(shuffle(allQuestions[part]));
        setCurrentIndex(0);
        setIsRecording(false);
    };

    useEffect(() => {
        setIsClient(true);
        let uid = localStorage.getItem(USER_ID_KEY);
        if (!uid) {
            uid = uuidv4();
            localStorage.setItem(USER_ID_KEY, uid);
        }
        currentUserId.current = uid;
        setUserName(localStorage.getItem(USER_NAME_KEY) || '');
        setShuffledQuestions(shuffle(allQuestions['part1']));
    }, []);

    // --- Recording Logic ---
    const startRecording = async () => {
        try {
            audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(audioStream.current);
            currentAudioChunk.current = [];
            
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) currentAudioChunk.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(currentAudioChunk.current, { type: 'audio/webm' });
                audioBlobs.current[currentPart][currentIndex] = blob;
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            alert("ไม่สามารถเข้าถึงไมโครโฟนได้: " + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
            audioStream.current.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    // --- Data Submission ---
    const handleNext = async () => {
        if (!audioBlobs.current[currentPart][currentIndex]) {
            alert("กรุณาบันทึกเสียงก่อนไปข้อถัดไป");
            return;
        }

        if (currentIndex < shuffledQuestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // จบ Part - อัปโหลดข้อมูล
            setIsLoading(true);
            try {
                const partNum = parseInt(currentPart.replace('part', ''));
                for (let i = 0; i < shuffledQuestions.length; i++) {
                    const blob = audioBlobs.current[currentPart][i];
                    const fileName = `${currentUserId.current}/${currentPart}/q${i+1}_${uuidv4()}.webm`;
                    
                    await supabase.storage.from('responses').upload(fileName, blob);
                    const { data: { publicUrl } } = supabase.storage.from('responses').getPublicUrl(fileName);

                    await supabase.from('submissions').insert([{
                        user_id: currentUserId.current,
                        name: userName || "Anonymous",
                        part_number: partNum,
                        question_number: i + 1,
                        question_text: shuffledQuestions[i],
                        audio_url: publicUrl
                    }]);
                }

                partCompletion.current[currentPart] = true;
                if (partCompletion.current.part1 && partCompletion.current.part2 && partCompletion.current.part3) {
                    setShowCertificate(true);
                } else {
                    const nextPart = currentPart === 'part1' ? 'part2' : (currentPart === 'part2' ? 'part3' : 'part3');
                    loadPart(nextPart);
                }
            } catch (err) {
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (!isClient) return null;

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{
            background: 'linear-gradient(-45deg, #74ebd5, #9face6, #a18cd1, #fbc2eb)',
            backgroundSize: '400% 400%',
            animation: 'gradientBG 15s ease infinite'
        }}>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            {/* Loading Overlay */}
            {isLoading && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white" 
                     style={{background: 'rgba(0,0,0,0.8)', zIndex: 9999}}>
                    <div className="spinner-border mb-3"></div>
                    <h5>กำลังประมวลผลและอัปโหลดข้อมูล...</h5>
                </div>
            )}

            {/* Certificate Page */}
            {showCertificate ? (
                <div className="card p-5 text-center shadow-lg border-warning" style={{maxWidth: '800px', border: '10px solid gold'}}>
                    <h1 className="display-4 text-warning">🎉 สำเร็จแล้ว 🎉</h1>
                    <p className="lead">มอบให้แด่ คุณ <strong>{userName || 'ผู้ทดสอบ'}</strong></p>
                    <p>คุณได้ผ่านการทดสอบ Roleplay ครบทั้ง 3 ส่วนเรียบร้อยแล้ว</p>
                    <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>เริ่มการทดสอบใหม่</button>
                </div>
            ) : (
                <div className="card shadow-lg p-4 w-100" style={{maxWidth: '650px', borderRadius: '20px'}}>
                    <h2 className="text-center mb-4">แบบทดสอบ Roleplay</h2>
                    
                    <div className="mb-4">
                        <label className="form-label fw-bold">ชื่อ-นามสกุล ผู้ทดสอบ</label>
                        <input type="text" className="form-control form-control-lg" value={userName} 
                               onChange={(e) => {
                                   setUserName(e.target.value);
                                   localStorage.setItem(USER_NAME_KEY, e.target.value);
                               }} placeholder="กรุณาระบุชื่อของคุณ" />
                    </div>

                    <div className="d-flex justify-content-center gap-2 mb-4">
                        {['part1', 'part2', 'part3'].map(p => (
                            <span key={p} className={`badge p-2 ${currentPart === p ? 'bg-primary' : 'bg-secondary'}`}>
                                Part {p.slice(-1)} {partCompletion.current[p] ? '✅' : ''}
                            </span>
                        ))}
                    </div>

                    <div className="alert alert-light border text-center py-5 mb-4 shadow-sm">
                        <h6 className="text-muted mb-2">คำถามที่ {currentIndex + 1} / {shuffledQuestions.length}</h6>
                        <h3 className="fw-bold text-dark">{shuffledQuestions[currentIndex]}</h3>
                    </div>

                    <div className="text-center mb-4">
                        <p className={`fw-bold ${isRecording ? 'text-danger animate-pulse' : 'text-muted'}`}>
                            {isRecording ? '🔴 กำลังอัดเสียง...' : '🟢 พร้อมบันทึกเสียง'}
                        </p>
                        
                        <div className="d-flex justify-content-center gap-3">
                            {!isRecording ? (
                                <button className="btn btn-danger btn-lg rounded-circle p-4" onClick={startRecording}>
                                    <i className="bi bi-mic-fill fs-3"></i>
                                </button>
                            ) : (
                                <button className="btn btn-secondary btn-lg rounded-circle p-4" onClick={stopRecording}>
                                    <i className="bi bi-stop-fill fs-3"></i>
                                </button>
                            )}
                        </div>
                        
                        {audioBlobs.current[currentPart][currentIndex] && !isRecording && (
                            <div className="mt-3">
                                <i className="bi bi-check-circle-fill text-success"></i> บันทึกแล้ว
                                <audio className="d-block mx-auto mt-2" src={URL.createObjectURL(audioBlobs.current[currentPart][currentIndex])} controls />
                            </div>
                        )}
                    </div>

                    <div className="d-flex justify-content-between">
                        <button className="btn btn-outline-secondary" disabled={currentIndex === 0} 
                                onClick={() => setCurrentIndex(prev => prev - 1)}>ย้อนกลับ</button>
                        <button className="btn btn-primary px-5" onClick={handleNext}>
                            {currentIndex === shuffledQuestions.length - 1 ? 'ส่งข้อมูลและไปต่อ' : 'ข้อถัดไป'}
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes gradientBG {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-pulse {
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}