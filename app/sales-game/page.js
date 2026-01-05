'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import confetti from 'canvas-confetti';

export default function SalesJigsawMaster() {
    const [gameState, setGameState] = useState('start'); // start, playing, won
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [wrongId, setWrongId] = useState(null);
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
        const { x, y } = info.point;
        let isCorrectMatch = false;

        shuffledObjections.forEach((obj) => {
            const targetEl = document.getElementById(`target-${obj.id}`);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const isOverTarget = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

                if (isOverTarget && obj.id === draggedId) {
                    setMatchedIds(prev => [...prev, draggedId]);
                    setScore(prev => {
                        const newScore = prev + 1;
                        if (newScore === pairs.length) {
                            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                            setTimeout(() => setGameState('won'), 1000);
                        }
                        return newScore;
                    });
                    playSound(pairs.find(p => p.id === draggedId).aAudio);
                    isCorrectMatch = true;
                }
            }
        });

        if (!isCorrectMatch) {
            setWrongId(draggedId);
            setTimeout(() => setWrongId(null), 500);
        }
    };

    return (
        <div className="main-wrapper">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                body { background: #020617; font-family: 'Sarabun', sans-serif; color: white; margin: 0; overflow-x: hidden; }
                .main-wrapper { min-height: 100vh; background: radial-gradient(circle at top, #1e293b 0%, #020617 100%); padding: 20px; }
                .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; }
                .jigsaw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-width: 950px; margin: 0 auto; }
                .card-base { min-height: 85px; padding: 15px; border-radius: 18px; display: flex; align-items: center; position: relative; transition: all 0.3s ease; font-size: 0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
                .obj-card { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); border: 1px solid rgba(255,255,255,0.2); }
                .ans-card { background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); cursor: grab; touch-action: none; }
                .correct-match { background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important; border: none !important; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); opacity: 0.9; }
                .play-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; border: none; color: white; }
                @media (max-width: 600px) { .card-base { font-size: 0.75rem; min-height: 70px; padding: 10px; } .jigsaw-grid { gap: 10px; } }
            `}</style>
            
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            {/* 1. หน้าเริ่มต้น */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-5 mt-5">
                        <div className="glass p-5 d-inline-block shadow-lg">
                            <i className="bi bi-patch-check text-info display-1 mb-3"></i>
                            <h1 className="fw-bold mb-3">Sales Jigsaw</h1>
                            <p className="opacity-75 mb-4">ฝึกทักษะการตอบโต้ข้อโต้แย้งลูกค้าให้แม่นยำ</p>
                            <button onClick={() => setGameState('playing')} className="btn btn-primary btn-lg px-5 rounded-pill shadow">เริ่มกิจกรรม</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. หน้าเล่นเกม */}
            {gameState === 'playing' && (
                <div className="container-fluid">
                    <div className="d-flex justify-content-between align-items-center max-width-950 mx-auto mb-4">
                        <div className="glass px-4 py-2 fw-bold text-info shadow">คะแนน: {score} / 10</div>
                        <button className="btn btn-outline-light rounded-pill btn-sm" onClick={() => setShowQR(true)}>
                            <i className="bi bi-qr-code"></i> แชร์เกม
                        </button>
                    </div>

                    <div className="jigsaw-grid">
                        <div className="d-flex flex-column gap-3">
                            {shuffledObjections.map((item) => (
                                <div key={`obj-${item.id}`} id={`target-${item.id}`}
                                     className={`card-base obj-card ${matchedIds.includes(item.id) ? 'correct-match' : ''}`}>
                                    <button className="play-btn" onClick={() => playSound(item.qAudio)}><i className="bi bi-volume-up-fill"></i></button>
                                    <div className="fw-bold text-white">{item.q}</div>
                                </div>
                            ))}
                        </div>

                        <div className="d-flex flex-column gap-3">
                            {shuffledAnswers.map((item) => (
                                <div key={`ans-container-${item.id}`} style={{ minHeight: '85px' }}>
                                    {!matchedIds.includes(item.id) ? (
                                        <motion.div 
                                            drag 
                                            dragSnapToOrigin 
                                            onDragEnd={(e, info) => handleDragEnd(e, info, item.id)}
                                            animate={wrongId === item.id ? { x: [-10, 10, -10, 10, 0], backgroundColor: "#ef4444" } : { backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                            whileDrag={{ scale: 1.08, zIndex: 1000, boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}
                                            className="card-base ans-card"
                                        >
                                            <button className="play-btn" onClick={() => playSound(item.aAudio)}><i className="bi bi-play-circle-fill"></i></button>
                                            <div className="text-white-50">{item.a}</div>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="card-base correct-match">
                                            <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                                            <div className="small opacity-90">{item.a}</div>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. หน้าสรุปผล */}
            <AnimatePresence>
                {gameState === 'won' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="position-fixed inset-0 d-flex align-items-center justify-content-center p-3" style={{zIndex: 3000, background: 'rgba(2, 6, 23, 0.9)', top:0, left:0, width:'100%', height:'100%'}}>
                        <div className="glass p-5 text-center shadow-lg border-success" style={{maxWidth: '450px'}}>
                            <div className="display-1 text-warning mb-3"><i className="bi bi-trophy-fill shadow-glow"></i></div>
                            <h2 className="fw-bold text-white mb-2">ยินดีด้วย! ยอดนักขาย</h2>
                            <p className="opacity-75 mb-4">คุณทำคะแนนได้เต็ม 10/10 คะแนน!</p>
                            <button onClick={() => window.location.reload()} className="btn btn-success btn-lg w-100 rounded-pill shadow-lg">เล่นใหม่อีกครั้ง</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. QR Code Modal */}
            <AnimatePresence>
                {showQR && (
                    <div className="position-fixed inset-0 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 4000, top:0, left:0, width:'100%', height:'100%' }} onClick={() => setShowQR(false)}>
                        <div className="bg-white p-4 rounded-4 text-center" onClick={e => e.stopPropagation()}>
                            <h5 className="text-dark fw-bold mb-3">ชวนเพื่อนมาเล่นเกมนี้!</h5>
                            <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.href : ''} size={220} />
                            <button className="btn btn-dark w-100 mt-4 rounded-pill" onClick={() => setShowQR(false)}>ปิดหน้าต่าง</button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}