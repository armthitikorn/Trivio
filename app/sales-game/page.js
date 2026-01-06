'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function StableSalesJigsawAudio() {
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    
    // Selection States
    const [selectedQ, setSelectedQ] = useState(null); 
    const [selectedA, setSelectedA] = useState(null); 
    const [wrongPair, setWrongPair] = useState(null); 

    const pairs = [
        { id: 1, q: "เบี้ยแพงไปหน่อย จ่ายไม่ไหว", a: "เฉลี่ยวันละ 30 บาท น้อยกว่าค่ากาแฟ 1 แก้วด้วยซ้ำ", qAudio: "/audio/q1.wav", aAudio: "/audio/a1.wav" },
        { id: 2, q: "มีประกันเยอะแล้ว ครบแล้ว", a: "จริงๆคุ้มค่านะคะ เล่มนี้เน้นชดเชยรายได้ที่พี่ยังไม่มีค่ะ", qAudio: "/audio/q2.wav", aAudio: "/audio/a2.wav" },
        { id: 3, q: "ขอคุยกับลูกก่อนนะ", a: "ให้เจ้าหน้าที่ถือสายรอ หรือโทรกลับหาพร้อมกันดีคะ", qAudio: "/audio/q3.wav", aAudio: "/audio/a3.wav" },
        { id: 4, q: "ไม่ชอบรับข้อมูลทางโทรศัพท์", a: "จริงๆลูกค้าสามารถรับฟังเพื่อเก็บไว้เป็นข้อมูลได้นะคะ", qAudio: "/audio/q4.wav", aAudio: "/audio/a4.wav" },
        { id: 5, q: "สุขภาพแข็งแรง ไม่เคยป่วย", a: "ทำไว้วันนี้เพื่อคุ้มครองโรคในอนาคตที่คาดไม่ถึงนะคะ", qAudio: "/audio/q5.wav", aAudio: "/audio/a5.wav" },
        { id: 6, q: "ส่งเอกสารมาให้ดูก่อนแล้วกัน", a: "สรุป 3 จุดเด่นหน้าจอนี้ให้ฟังแบบกระชับเข้าใจง่ายนะคะ", qAudio: "/audio/q6.wav", aAudio: "/audio/a6.wav" },
        { id: 7, q: "ทำงานอยู่ ไม่สะดวกคุย", a: "ขอเวลาสั้นๆ 3-5 นาทีที่เป็นประโยชน์กับพี่ สะดวกนะคะ", qAudio: "/audio/q7.wav", aAudio: "/audio/a7.wav" },
        { id: 8, q: "กลัวเคลมยาก ยุ่งยาก", a: "เรามีระบบ E-Claim ผ่านมือถือ สะดวกใน 5 นาทีเลยค่ะ", qAudio: "/audio/q8.wav", aAudio: "/audio/a8.wav" },
        { id: 9, q: "เป็นมิจฉาชีพหรือเปล่า", a: "เช็คใบอนุญาตเจ้าหน้าที่ผ่านเว็บ ค.ป.ภ. ได้ทันทีค่ะ", qAudio: "/audio/q9.wav", aAudio: "/audio/a9.wav" },
        { id: 10, q: "เบี้ยจ่ายทิ้งไม่ได้อะไรคืน", a: "เป็นการซื้อความสบายใจให้ครอบครัวในราคาถูกที่สุดค่ะ", qAudio: "/audio/q10.wav", aAudio: "/audio/a10.wav" }
    ];

    useEffect(() => {
        if (gameState === 'playing') {
            setShuffledObjections([...pairs].sort(() => Math.random() - 0.5));
            setShuffledAnswers([...pairs].sort(() => Math.random() - 0.5));
            setMatchedIds([]);
            setSelectedQ(null);
            setSelectedA(null);
        }
    }, [gameState]);

    // ฟังก์ชันเล่นเสียง
    const playSound = (url) => {
        if (!url) return;
        const audio = new Audio(url);
        audio.play().catch(e => console.log("Audio play blocked or file not found"));
    };

    // ตรวจสอบการจับคู่
    useEffect(() => {
        if (selectedQ && selectedA) {
            if (selectedQ === selectedA) {
                // กรณีเลือกถูก
                const correctPair = pairs.find(p => p.id === selectedQ);
                playSound(correctPair.aAudio); // เล่นเสียงคำตอบเมื่อเลือกถูก
                
                setMatchedIds(prev => [...prev, selectedQ]);
                setSelectedQ(null);
                setSelectedA(null);
                
                if (matchedIds.length + 1 === pairs.length) {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    setTimeout(() => setGameState('won'), 1000);
                }
            } else {
                // กรณีเลือกผิด
                setWrongPair({ q: selectedQ, a: selectedA });
                setTimeout(() => {
                    setWrongPair(null);
                    setSelectedQ(null);
                    setSelectedA(null);
                }, 600);
            }
        }
    }, [selectedQ, selectedA]);

    const handleSelectQ = (item) => {
        if (matchedIds.includes(item.id)) return;
        setSelectedQ(item.id);
        playSound(item.qAudio); // เล่นเสียงข้อโต้แย้งเมื่อกดเลือก
    };

    const handleSelectA = (item) => {
        if (matchedIds.includes(item.id)) return;
        setSelectedA(item.id);
        // สามารถเพิ่ม playSound(item.aAudio) ตรงนี้ได้หากต้องการให้ดังทันทีที่จิ้ม
    };

    return (
        <div className="main-wrapper">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                body { background: #020617; font-family: 'Sarabun', sans-serif; color: white; margin: 0; }
                .main-wrapper { min-height: 100vh; background: radial-gradient(circle at top, #1e293b 0%, #020617 100%); padding: 20px 15px; }
                .game-box { max-width: 900px; margin: 0 auto; }
                
                .jigsaw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                
                .card-item { 
                    min-height: 75px; padding: 15px; border-radius: 18px; 
                    display: flex; align-items: center; justify-content: flex-start;
                    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255,255,255,0.1); font-size: 0.95rem;
                    background: rgba(255,255,255,0.03); backdrop-filter: blur(10px);
                }

                .card-q { border-left: 6px solid #3b82f6; } /* ฝั่งคำถามสีน้ำเงิน */
                .card-a { border-left: 6px solid #a855f7; } /* ฝั่งคำตอบสีม่วง */

                /* Active & States */
                .selected-q { background: rgba(59, 130, 246, 0.25); border-color: #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); transform: scale(1.02); }
                .selected-a { background: rgba(168, 85, 247, 0.25); border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); transform: scale(1.02); }
                .is-matched { opacity: 0.3; pointer-events: none; filter: grayscale(1); border-left-color: #10b981; }
                .is-wrong { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.2) !important; animation: shake 0.4s ease-in-out; }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    75% { transform: translateX(6px); }
                }

                .column-title { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }

                @media (max-width: 768px) {
                    .jigsaw-grid { grid-template-columns: 1fr; gap: 20px; }
                    .card-item { min-height: 65px; font-size: 0.85rem; padding: 12px; }
                }
            `}</style>
            
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            <div className="game-box">
                {/* Score Header */}
                <div className="d-flex justify-content-between align-items-center mb-4 bg-dark bg-opacity-50 p-3 rounded-4 border border-secondary">
                    <h5 className="mb-0 fw-bold"><i className="bi bi-puzzle-fill text-primary me-2"></i>Sales Jigsaw</h5>
                    <div className="badge bg-primary rounded-pill px-3 py-2">ความสำเร็จ: {matchedIds.length} / {pairs.length}</div>
                </div>

                {gameState === 'playing' && (
                    <div className="jigsaw-grid">
                        {/* ฝั่งข้อโต้แย้ง (Q) */}
                        <div className="d-flex flex-column gap-2">
                            <div className="column-title text-center"><i className="bi bi-person-circle me-1"></i> ลูกค้าพูดว่า...</div>
                            {shuffledObjections.map((item) => (
                                <motion.div
                                    key={`q-${item.id}`}
                                    onClick={() => handleSelectQ(item)}
                                    className={`card-item card-q 
                                        ${selectedQ === item.id ? 'selected-q' : ''} 
                                        ${matchedIds.includes(item.id) ? 'is-matched' : ''}
                                        ${wrongPair?.q === item.id ? 'is-wrong' : ''}
                                    `}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <div className="me-3">
                                        <i className={`bi ${matchedIds.includes(item.id) ? 'bi-check-circle-fill text-success' : 'bi-volume-up-fill opacity-50'}`}></i>
                                    </div>
                                    <div className="fw-semibold">{item.q}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ฝั่งคำตอบ (A) */}
                        <div className="d-flex flex-column gap-2">
                            <div className="column-title text-center"><i className="bi bi-chat-left-dots-fill me-1"></i> วิธีการตอบกลับ</div>
                            {shuffledAnswers.map((item) => (
                                <motion.div
                                    key={`a-${item.id}`}
                                    onClick={() => handleSelectA(item)}
                                    className={`card-item card-a 
                                        ${selectedA === item.id ? 'selected-a' : ''} 
                                        ${matchedIds.includes(item.id) ? 'is-matched' : ''}
                                        ${wrongPair?.a === item.id ? 'is-wrong' : ''}
                                    `}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <div className="me-3">
                                        <i className={`bi ${matchedIds.includes(item.id) ? 'bi-patch-check-fill text-success' : 'bi-magic opacity-50'}`}></i>
                                    </div>
                                    <div>{item.a}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* หน้าเริ่มเกม */}
                <AnimatePresence>
                    {gameState === 'start' && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-5 glass rounded-5 mt-4">
                            <i className="bi bi-stars text-warning display-1 mb-3"></i>
                            <h2 className="fw-bold">พร้อมฝึกทักษะหรือยัง?</h2>
                            <p className="opacity-75 mb-4">จิ้ม "ข้อโต้แย้ง" แล้วเลือก "คำตอบ" ที่ดีที่สุด</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-primary btn-lg px-5 rounded-pill shadow-lg">เริ่มเล่นเลย</button>
                        </motion.div>
                    )}

                    {/* หน้าชนะ */}
                    {gameState === 'won' && (
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="text-center py-5 glass border-success rounded-5 mt-4">
                            <i className="bi bi-trophy-fill text-warning display-1 mb-3"></i>
                            <h2 className="fw-bold text-white">ยอดนักขายระดับทอง!</h2>
                            <p className="mb-4 text-info">คุณตอบข้อโต้แย้งได้ถูกต้องครบถ้วน</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-success btn-lg px-5 rounded-pill shadow">ฝึกซ้ำอีกครั้ง</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}