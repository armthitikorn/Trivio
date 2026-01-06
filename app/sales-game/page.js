'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import confetti from 'canvas-confetti';

export default function UltimateSalesJigsaw() {
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    
    // Selection & UI States
    const [selectedQ, setSelectedQ] = useState(null); 
    const [selectedA, setSelectedA] = useState(null); 
    const [wrongPair, setWrongPair] = useState(null); 
    const [showQR, setShowQR] = useState(false);

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

    const playSound = (url) => {
        if (!url) return;
        const audio = new Audio(url);
        audio.play().catch(() => {});
    };

    // Logic ตรวจสอบการจับคู่
    useEffect(() => {
        if (selectedQ && selectedA) {
            if (selectedQ === selectedA) {
                const correctPair = pairs.find(p => p.id === selectedQ);
                playSound(correctPair.aAudio);
                
                setMatchedIds(prev => [...prev, selectedQ]);
                setSelectedQ(null);
                setSelectedA(null);
                
                if (matchedIds.length + 1 === pairs.length) {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    setTimeout(() => setGameState('won'), 1000);
                }
            } else {
                setWrongPair({ q: selectedQ, a: selectedA });
                setTimeout(() => {
                    setWrongPair(null);
                    setSelectedQ(null);
                    setSelectedA(null);
                }, 600);
            }
        }
    }, [selectedQ, selectedA]);

    return (
        <div className="main-wrapper">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                body { background: #020617; font-family: 'Sarabun', sans-serif; color: white; margin: 0; overflow-x: hidden; }
                .main-wrapper { min-height: 100vh; background: radial-gradient(circle at top, #1e293b 0%, #020617 100%); padding: 20px 10px; }
                .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; }
                .card-item { 
                    min-height: 75px; padding: 15px; border-radius: 18px; display: flex; align-items: center; 
                    cursor: pointer; transition: all 0.2s ease; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
                }
                .card-q { border-left: 6px solid #3b82f6; }
                .card-a { border-left: 6px solid #a855f7; }
                .selected-q { background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; transform: scale(1.02); box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                .selected-a { background: rgba(168, 85, 247, 0.2); border-color: #a855f7; transform: scale(1.02); box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
                .matched { opacity: 0.2; pointer-events: none; filter: grayscale(1); }
                .wrong { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.1) !important; animation: shake 0.4s; }
                @keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-5px);} 75% {transform: translateX(5px);} }
                @media (max-width: 768px) { .jigsaw-grid { grid-template-columns: 1fr !important; gap: 20px; } }
            `}</style>
            
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            <div className="container" style={{maxWidth: '950px'}}>
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-4 glass p-3 shadow">
                    <div>
                        <h4 className="mb-0 fw-bold text-info"><i className="bi bi-puzzle-fill me-2"></i>Sales Jigsaw</h4>
                    </div>
                    <div className="d-flex gap-2">
                        <div className="badge bg-primary d-flex align-items-center px-3 rounded-pill">
                            คะแนน: {matchedIds.length} / 10
                        </div>
                        <button className="btn btn-outline-light btn-sm rounded-circle" onClick={() => setShowQR(true)} style={{width: '35px', height:'35px'}}>
                            <i className="bi bi-qr-code"></i>
                        </button>
                    </div>
                </div>

                {gameState === 'playing' && (
                    <div className="jigsaw-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        {/* ฝั่งข้อโต้แย้ง */}
                        <div className="d-flex flex-column gap-2">
                            <small className="text-center opacity-50 mb-2">ข้อโต้แย้งลูกค้า (จิ้มเพื่อฟัง)</small>
                            {shuffledObjections.map((item) => (
                                <motion.div key={`q-${item.id}`} 
                                    onClick={() => { if(!matchedIds.includes(item.id)) { setSelectedQ(item.id); playSound(item.qAudio); } }}
                                    className={`card-item card-q ${selectedQ === item.id ? 'selected-q' : ''} ${matchedIds.includes(item.id) ? 'matched' : ''} ${wrongPair?.q === item.id ? 'wrong' : ''}`}>
                                    <i className="bi bi-volume-up me-2 opacity-50"></i>
                                    <div className="fw-bold">{item.q}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ฝั่งวิธีตอบกลับ */}
                        <div className="d-flex flex-column gap-2">
                            <small className="text-center opacity-50 mb-2">วิธีตอบที่ถูกต้อง (จิ้มเลือกคู่)</small>
                            {shuffledAnswers.map((item) => (
                                <motion.div key={`a-${item.id}`} 
                                    onClick={() => !matchedIds.includes(item.id) && setSelectedA(item.id)}
                                    className={`card-item card-a ${selectedA === item.id ? 'selected-a' : ''} ${matchedIds.includes(item.id) ? 'matched' : ''} ${wrongPair?.a === item.id ? 'wrong' : ''}`}>
                                    <i className="bi bi-chat-heart me-2 opacity-50"></i>
                                    <div>{item.a}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* หน้าเริ่มต้น / ชนะ */}
                <AnimatePresence>
                    {gameState === 'start' && (
                        <div className="text-center py-5 mt-4">
                            <button onClick={() => setGameState('playing')} className="btn btn-primary btn-lg px-5 rounded-pill shadow-lg py-3">เริ่มฝึกฝน</button>
                        </div>
                    )}
                    {gameState === 'won' && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-5 glass border-success mt-4">
                            <i className="bi bi-trophy-fill text-warning display-1 mb-3"></i>
                            <h2 className="fw-bold">สุดยอดนักขาย!</h2>
                            <p className="opacity-75">คุณจัดการข้อโต้แย้งได้ครบ 10 ข้อแล้ว</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-success btn-lg px-5 rounded-pill mt-3">เล่นอีกครั้ง</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* QR Code Modal */}
                <AnimatePresence>
                    {showQR && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" 
                            style={{ background: 'rgba(0,0,0,0.9)', zIndex: 9999 }} onClick={() => setShowQR(false)}>
                            <div className="bg-white p-4 rounded-4 text-center shadow-lg" onClick={e => e.stopPropagation()}>
                                <h5 className="text-dark fw-bold mb-3">ชวนเพื่อนมาฝึกด้วยกัน!</h5>
                                <div className="p-3 bg-light rounded-3 d-inline-block">
                                    <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.href : ''} size={200} />
                                </div>
                                <button className="btn btn-dark w-100 mt-4 rounded-pill" onClick={() => setShowQR(false)}>ปิดหน้าต่าง</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}