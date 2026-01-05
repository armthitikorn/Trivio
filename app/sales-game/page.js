'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import confetti from 'canvas-confetti'; // ต้องลง npm install canvas-confetti

export default function EnhancedSalesJigsaw() {
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [wrongId, setWrongId] = useState(null); // สำหรับทำเอฟเฟกต์สั่นตอนตอบผิด
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
            setScore(0);
        }
    }, [gameState]);

    const playSound = (url) => {
        const audio = new Audio(url);
        audio.play().catch(() => {});
    };

    const handleDragEnd = (event, info, draggedId) => {
        let foundTarget = false;

        shuffledObjections.forEach((obj) => {
            const el = document.getElementById(`target-${obj.id}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const { x, y } = info.point;

                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    foundTarget = true;
                    if (obj.id === draggedId) {
                        // ถูกต้อง!
                        setMatchedIds(prev => [...prev, draggedId]);
                        setScore(prev => {
                            const newScore = prev + 1;
                            if (newScore === pairs.length) triggerWin();
                            return newScore;
                        });
                        playSound(pairs.find(p => p.id === draggedId).aAudio);
                    } else {
                        // ผิดคู่!
                        setWrongId(draggedId);
                        setTimeout(() => setWrongId(null), 500);
                        // playSound('/audio/wrong.mp3'); // ถ้ามีไฟล์เสียงผิด
                    }
                }
            }
        });
    };

    const triggerWin = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#60a5fa', '#10b981', '#fbbf24'] });
        setTimeout(() => setGameState('won'), 1000);
    };

    // Animation Variants
    const shakeVariants = {
        shake: { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 }, backgroundColor: "#ef4444" }
    };

    return (
        <div className="game-wrapper">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                body { background: #020617; font-family: 'Sarabun', sans-serif; color: white; overflow-x: hidden; }
                .game-wrapper { min-height: 100vh; background: radial-gradient(circle at top, #1e293b 0%, #020617 100%); padding: 20px; }
                .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; }
                .jigsaw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-width: 900px; margin: 0 auto; }
                .card-item { min-height: 85px; padding: 15px; border-radius: 16px; display: flex; align-items: center; transition: all 0.3s ease; font-size: 0.9rem; position: relative; }
                .obj-card { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                .ans-card { background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); cursor: grab; touch-action: none; }
                .matched-status { background: #059669 !important; border: none !important; opacity: 0.8; }
                .play-icon { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
                @media (max-width: 600px) { .card-item { font-size: 0.75rem; padding: 10px; min-height: 70px; } .jigsaw-grid { gap: 10px; } }
            `}</style>

            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            {/* หน้าเริ่มเกม */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-5">
                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass p-5 d-inline-block shadow-lg">
                            <i className="bi bi-puzzle text-info" style={{ fontSize: '4rem' }}></i>
                            <h1 className="display-5 fw-bold mt-3">Sales Jigsaw</h1>
                            <p className="opacity-75 mb-4">ฝึกรับมือข้อโต้แย้งลูกค้าให้เป็นมืออาชีพ</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm">เริ่มเล่นเลย</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* หน้าเล่นเกม */}
            {gameState === 'playing' && (
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="glass px-3 py-2">
                            <span className="text-info fw-bold">คะแนน: {score} / 10</span>
                        </div>
                        <button className="btn btn-outline-light btn-sm rounded-pill" onClick={() => setShowQR(true)}>
                            <i className="bi bi-qr-code"></i> แชร์
                        </button>
                    </div>

                    <div className="jigsaw-grid">
                        {/* ฝั่งคำถาม */}
                        <div className="d-flex flex-column gap-3">
                            {shuffledObjections.map((item) => (
                                <div key={`obj-${item.id}`} id={`target-${item.id}`} 
                                     className={`card-item obj-card ${matchedIds.includes(item.id) ? 'matched-status' : ''}`}>
                                    <div className="play-icon" onClick={() => playSound(item.qAudio)}><i className="bi bi-volume-up"></i></div>
                                    <div className="fw-semibold">{item.q}</div>
                                </div>
                            ))}
                        </div>

                        {/* ฝั่งคำตอบ */}
                        <div className="d-flex flex-column gap-3">
                            {shuffledAnswers.map((item) => (
                                <div key={`ans-wrap-${item.id}`} style={{ minHeight: '85px' }}>
                                    {!matchedIds.includes(item.id) ? (
                                        <motion.div 
                                            drag 
                                            dragSnapToOrigin 
                                            onDragEnd={(e, info) => handleDragEnd(e, info, item.id)}
                                            animate={wrongId === item.id ? "shake" : ""}
                                            variants={shakeVariants}
                                            whileHover={{ scale: 1.02 }}
                                            whileDrag={{ scale: 1.1, zIndex: 100, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
                                            className="card-item ans-card"
                                        >
                                            <div className="play-icon" onClick={() => playSound(item.aAudio)}><i className="bi bi-play-fill"></i></div>
                                            <div>{item.a}</div>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-item matched-status shadow-glow">
                                            <i className="bi bi-check-circle-fill me-2 text-warning"></i>
                                            <span className="opacity-75">{item.a}</span>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* หน้าชนะเกม */}
            <AnimatePresence>
                {gameState === 'won' && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-5">
                        <div className="glass p-5 d-inline-block border-success">
                            <h1 className="text-warning display-3 mb-3"><i className="bi bi-trophy-fill"></i></h1>
                            <h2 className="fw-bold mb-3">คุณคือสุดยอดนักขาย!</h2>
                            <p className="mb-4">จับคู่ข้อโต้แย้งได้ถูกต้องครบถ้วน 10/10</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-success btn-lg rounded-pill px-5">เล่นอีกครั้ง</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Modal */}
            <AnimatePresence>
                {showQR && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                onClick={() => setShowQR(false)} className="position-fixed inset-0 d-flex align-items-center justify-content-center px-3" 
                                style={{ background: 'rgba(0,0,0,0.9)', zIndex: 2000, top: 0, left: 0, right: 0, bottom: 0 }}>
                        <div className="bg-white p-4 rounded-4 text-center text-dark" onClick={e => e.stopPropagation()}>
                            <h5 className="fw-bold mb-3">ชวนเพื่อนมาประลอง!</h5>
                            <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.href : ''} size={200} />
                            <button className="btn btn-dark w-100 mt-4 rounded-pill" onClick={() => setShowQR(false)}>ปิดหน้าต่าง</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}