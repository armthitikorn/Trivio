'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react'; // ตัวสร้าง QR Code

export default function SalesJigsawGame() {
    // --- 1. การจัดการ State ของเกม ---
    const [isClient, setIsClient] = useState(false);
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [showQR, setShowQR] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

    // --- 2. ข้อมูลข้อโต้แย้งและบทตอบโต้ (10 ข้อตามที่คุณระบุ) ---
    const pairs = [
        { id: 1, q: "เบี้ยแพงไปหน่อย จ่ายไม่ไหว", a: "เฉลี่ยวันละ 30 บาท น้อยกว่าค่ากาแฟ 1 แก้วด้วยซ้ำอยากให้พิจารณาไปด้วยกันเลยนะคะ", qAudio: "/audio/q1.wav", aAudio: "/audio/a1.wav" },
        { id: 2, q: "มีประกันเยอะแล้ว ครบแล้ว", a: "จริงๆคุ้มค่านะคะ เพราะเล่มนี้เน้นชดเชย รายได้ ที่พี่ยังไม่มีค่ะ", qAudio: "/audio/q2.wav", aAudio: "/audio/a2.wav" },
        { id: 3, q: "ขอคุยกับลูกก่อนนะ", a: "ให้เจ้าหน้าที่ถือสายรอ หรือโทรกลับหาพร้อมกันดีคะ", qAudio: "/audio/q3.wav", aAudio: "/audio/a3.wav" },
        { id: 4, q: "ไม่ชอบรับข้อมูลผ่านทางโทรศัพท์", a: "จริงๆลูกค้าสามารถรับฟังเพื่อเก็บไว้เป็นข้อมูลได้นะคะ", qAudio: "/audio/q4.wav", aAudio: "/audio/a4.wav" },
        { id: 5, q: "สุขภาพแข็งแรง ไม่เคยป่วยไม่เคยนอนโรงพยาบาล", a: "ทำไว้วันนี้เพื่อคุ้มครองโรคในอนาคตที่คาดไม่ถึงดีกว่านะคะ", qAudio: "/audio/q5.wav", aAudio: "/audio/a5.wav" },
        { id: 6, q: "ส่งเอกสารมาให้ดูก่อนแล้วกัน", a: "สรุป 3 จุดเด่นในหน้าจอนี้ให้ลูกค้าฟังแบบกระชับเข้าใจง่ายๆ นะคะ", qAudio: "/audio/q6.wav", aAudio: "/audio/a6.wav" },
        { id: 7, q: "ทำงานอยู่ ไม่สะดวกคุย", a: "ขอเวลาสั้นๆ 3-5 นาทีที่เป็นประโยชน์กับพี่ สะดวกนะคะ", qAudio: "/audio/q7.wav", aAudio: "/audio/a7.wav" },
        { id: 8, q: "กลัวเคลมยาก ต้องเตรียมเอกสารเยอะยุ่งยาก", a: "เรามีระบบ E-Claim ผ่านมือถือ สะดวกใน 5 นาทีเลยค่ะ", qAudio: "/audio/q8.wav", aAudio: "/audio/a8.wav" },
        { id: 9, q: "เป็นมิจฉาชีพหรือเปล่า", a: "ลูกค้าสามารถเช็คใบอนุญาตเจ้าหน้าที่ผ่านเว็บค.ป.ภ.ตอนนี้ได้เลยค่ะ", qAudio: "/audio/q9.wav", aAudio: "/audio/a9.wav" },
        { id: 10, q: "เบี้ยจ่ายทิ้งไม่ได้อะไรคืนไม่ชอบ", a: "เป็นการซื้อความสบายใจให้ครอบครัวในราคาถูกที่สุดแล้วค่ะ", qAudio: "/audio/q10.wav", aAudio: "/audio/a10.wav" }
    ];

    // --- 3. การเริ่มต้นระบบ ---
    useEffect(() => {
        setIsClient(true);
        setCurrentUrl(window.location.href);
        initGame();
    }, []);

    const initGame = () => {
        setShuffledObjections([...pairs].sort(() => Math.random() - 0.5));
        setShuffledAnswers([...pairs].sort(() => Math.random() - 0.5));
        setMatchedIds([]);
        setScore(0);
    };

    // --- 4. ฟังก์ชันการทำงาน (เสียง และ การลากวาง) ---
    const playSound = (url) => {
        const audio = new Audio(url);
        audio.play().catch(e => console.error("ไม่พบไฟล์เสียงที่:", url));
    };

    const handleDragEnd = (event, info, pairId) => {
        const targetElement = document.getElementById(`target-${pairId}`);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const { x, y } = info.point;
            
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                if (!matchedIds.includes(pairId)) {
                    setMatchedIds(prev => [...prev, pairId]);
                    setScore(prev => prev + 1);
                }
            }
        }
    };

    if (!isClient) return null;

    return (
        <div className="game-container">
            {/* --- 5. การตกแต่ง CSS (Glassmorphism Style) --- */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                .game-container { min-height: 100vh; background: #0f172a; color: white; padding: 40px 20px; font-family: 'Sarabun', sans-serif; }
                .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 25px; }
                .jigsaw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1100px; margin: 0 auto; }
                .piece { min-height: 95px; display: flex; align-items: center; padding: 18px; border-radius: 15px; margin-bottom: 12px; position: relative; color: white !important; }
                .obj-card { background: linear-gradient(90deg, #1e40af, #3b82f6); border-left: 6px solid #60a5fa; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                .ans-card { background: rgba(255, 255, 255, 0.08); border: 2px dashed rgba(255, 255, 255, 0.3); cursor: grab; color: white !important; }
                .is-matched { background: #10b981 !important; border: none !important; opacity: 0.6; pointer-events: none; transition: all 0.5s ease; }
                .play-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 40px; height: 40px; color: white; margin-right: 15px; display: flex; align-items: center; justify-content: center; }
                .qr-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; }
            `}</style>

            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            <div className="container">
                {/* --- ส่วนหัวแสดงผล --- */}
                <div className="text-center mb-5">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="glass-card py-2 px-4">คะแนนปัจจุบัน: <strong>{score} / 10</strong></div>
                        <button className="btn btn-info rounded-pill px-4 fw-bold" onClick={() => setShowQR(true)}>
                            <i className="bi bi-qr-code-scan me-2"></i> สแกนเพื่อเข้าเล่น
                        </button>
                    </div>
                    <h1 className="fw-bold text-white mb-2">Sales Objection Jigsaw</h1>
                    <p className="text-info opacity-75">ฝึกทักษะการรับมือข้อโต้แย้งด้วยน้ำเสียงที่เป็นมืออาชีพ</p>
                </div>

                <div className="jigsaw-grid">
                    {/* --- ฝั่งโจทย์: ข้อโต้แย้งลูกค้า --- */}
                    <div className="column-questions">
                        <h6 className="text-muted mb-4 text-center">OBJECTIONS (ฟังเสียงลูกค้า)</h6>
                        {shuffledObjections.map((item) => (
                            <div key={item.id} id={`target-${item.id}`} className={`piece obj-card ${matchedIds.includes(item.id) ? 'is-matched' : ''}`}>
                                <button className="play-btn" onClick={() => playSound(item.qAudio)}>
                                    <i className="bi bi-volume-up-fill"></i>
                                </button>
                                <strong>{item.q}</strong>
                                {matchedIds.includes(item.id) && <i className="bi bi-check-circle-fill ms-auto fs-3 text-white"></i>}
                            </div>
                        ))}
                    </div>

                    {/* --- ฝั่งคำตอบ: บทตอบโต้พนักงาน --- */}
                    <div className="column-answers">
                        <h6 className="text-muted mb-4 text-center">RESPONSES (ลากไปวางจับคู่)</h6>
                        {shuffledAnswers.map((item) => (
                            <div key={item.id}>
                                {!matchedIds.includes(item.id) ? (
                                    <motion.div drag dragSnapToOrigin onDragEnd={(e, info) => handleDragEnd(e, info, item.id)} className="piece ans-card shadow-lg">
                                        <button className="play-btn" onClick={() => playSound(item.aAudio)}>
                                            <i className="bi bi-play-circle-fill"></i>
                                        </button>
                                        <small>{item.a}</small>
                                    </motion.div>
                                ) : (
                                    <div className="piece ans-card is-matched">
                                        <i className="bi bi-check-lg me-3 fs-4"></i>
                                        <small className="opacity-75">{item.a}</small>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Pop-up QR Code --- */}
            <AnimatePresence>
                {showQR && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="qr-overlay" onClick={() => setShowQR(false)}>
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="glass-card text-center bg-dark p-5" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                            <h4 className="mb-4 text-white">สแกนเพื่อร่วมสนุก</h4>
                            <div className="bg-white p-3 d-inline-block rounded-4 mb-4">
                                <QRCodeCanvas value={currentUrl} size={230} includeMargin={true} />
                            </div>
                            <p className="text-info small mb-4">{currentUrl}</p>
                            <button className="btn btn-outline-light w-100 rounded-pill py-2" onClick={() => setShowQR(false)}>ปิดหน้าต่าง</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- หน้าจอแสดงความยินดีเมื่อเล่นจบ --- */}
            <AnimatePresence>
                {score === 10 && (
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="position-fixed top-50 start-50 translate-middle glass-card text-center shadow-lg bg-success p-5" style={{ zIndex: 3000, minWidth: '350px' }}>
                        <h1 className="display-4 fw-bold text-white mb-3">สุดยอดมาก!</h1>
                        <p className="lead text-white mb-4">คุณจำสคริปต์การแก้ข้อโต้แย้งได้ครบ 10 ข้อแล้ว</p>
                        <button className="btn btn-light btn-lg w-100 rounded-pill" onClick={initGame}>เริ่มเกมใหม่อีกครั้ง</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}