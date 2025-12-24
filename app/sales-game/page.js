'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

export default function SalesJigsawGame() {
    const [isClient, setIsClient] = useState(false);
    const [matchedIds, setMatchedIds] = useState([]);
    const [shuffledObjections, setShuffledObjections] = useState([]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [showQR, setShowQR] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

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

    const playSound = (url) => {
        const audio = new Audio(url);
        audio.play().catch(e => console.error("Audio Error"));
    };

    const handleDragEnd = (event, info, pairId) => {
        const targetElement = document.getElementById(`target-${pairId}`);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            // ใช้ touch point แรกถ้ารองรับ touch event เพื่อความแม่นยำบนมือถือ
            const pointX = info.point.x;
            const pointY = info.point.y;

            if (pointX >= rect.left && pointX <= rect.right && pointY >= rect.top && pointY <= rect.bottom) {
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
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                
                body { margin: 0; padding: 0; overflow-x: hidden; background: #0f172a; }
                .game-container { 
                    min-height: 100vh; 
                    background: #0f172a; 
                    color: white; 
                    padding: 20px 10px; 
                    font-family: 'Sarabun', sans-serif; 
                    overflow-x: hidden; /* ป้องกันการเลื่อนซ้ายขวา */
                }

                /* บังคับ 2 คอลัมน์ตลอดเวลา */
                .jigsaw-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; /* คงไว้ที่ 2 คอลัมน์เสมอ */
                    gap: 12px; /* ลดช่องว่างระหว่างคอลัมน์ */
                    max-width: 1000px; 
                    margin: 0 auto; 
                }

                /* สไตล์ชิ้นส่วนพื้นฐาน */
                .piece { 
                    min-height: 80px; 
                    display: flex; 
                    align-items: center; 
                    padding: 12px; 
                    border-radius: 12px; 
                    margin-bottom: 8px; 
                    font-size: 0.9rem;
                    color: white !important;
                    line-height: 1.3;
                }
                
                .play-btn { 
                    background: rgba(255,255,255,0.2); border: none; border-radius: 50%; 
                    width: 32px; height: 32px; min-width: 32px; /* ขนาดปุ่มมาตรฐาน */
                    color: white; margin-right: 10px; display: flex; align-items: center; justify-content: center; 
                }

                /* ✅ Media Query สำหรับมือถือ (สำคัญมาก) */
                @media (max-width: 576px) {
                    .game-container { padding: 15px 5px; } /* ลดขอบจอ */
                    .jigsaw-grid { gap: 6px; } /* ลดช่องว่างระหว่างชิ้น */
                    
                    .piece { 
                        min-height: 65px; /* ลดความสูงชิ้นส่วน */
                        padding: 8px; /* ลดขอบใน */
                        font-size: 0.75rem; /* ลดขนาดตัวหนังสือ */
                        border-radius: 8px;
                    }
                    .play-btn {
                        width: 26px; height: 26px; min-width: 26px; /* ลดขนาดปุ่มเล่นเสียง */
                        margin-right: 6px; font-size: 0.8rem;
                    }
                    h1.game-title { font-size: 1.4rem !important; margin-bottom: 5px !important; }
                    .header-actions { margin-bottom: 10px !important; }
                }

                .obj-card { background: linear-gradient(90deg, #1e40af, #3b82f6); border-left: 4px solid #60a5fa; }
                .ans-card { background: rgba(255, 255, 255, 0.08); border: 1px dashed rgba(255, 255, 255, 0.4); cursor: grab; }
                .is-matched { background: #10b981 !important; opacity: 0.6; pointer-events: none; border: none !important; }
                
                .glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(5px); border-radius: 12px; }
                .qr-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
            `}</style>

            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />

            <div className="container-fluid px-0">
                {/* Header Section (ปรับให้กะทัดรัดบนมือถือ) */}
                <div className="text-center mb-3 header-actions">
                    <div className="d-flex justify-content-between align-items-center px-2 mb-2">
                        <div className="glass-card py-1 px-2 small fw-bold">คะแนน: {score}/10</div>
                        <button className="btn btn-sm btn-info rounded-pill px-3 py-1 small" onClick={() => setShowQR(true)}>
                            <i className="bi bi-qr-code-scan me-1"></i> แชร์
                        </button>
                    </div>
                    <h1 className="fw-bold text-white game-title">Sales Jigsaw</h1>
                    <p className="text-info small opacity-75 m-0">ลากคำตอบ (ขวา) วางทับข้อโต้แย้ง (ซ้าย)</p>
                </div>

                <div className="jigsaw-grid">
                    {/* Left Side: Objections */}
                    <div>
                        {shuffledObjections.map((item) => (
                            <div key={item.id} id={`target-${item.id}`} className={`piece obj-card shadow-sm ${matchedIds.includes(item.id) ? 'is-matched' : ''}`}>
                                <button className="play-btn" onClick={() => playSound(item.qAudio)}><i className="bi bi-volume-up-fill"></i></button>
                                <div style={{overflowWrap: 'break-word', wordBreak: 'break-word'}}><strong>{item.q}</strong></div>
                            </div>
                        ))}
                    </div>

                    {/* Right Side: Answers */}
                    <div style={{position: 'relative', zIndex: 10}}>
                        {shuffledAnswers.map((item) => (
                            <div key={item.id}>
                                {!matchedIds.includes(item.id) ? (
                                    <motion.div 
                                        drag 
                                        dragSnapToOrigin 
                                        onDragEnd={(e, info) => handleDragEnd(e, info, item.id)} 
                                        className="piece ans-card shadow-sm"
                                        whileDrag={{ scale: 1.05, zIndex: 1000, boxShadow: "0px 10px 20px rgba(0,0,0,0.3)" }}
                                    >
                                        <button className="play-btn" onClick={() => playSound(item.aAudio)}><i className="bi bi-play-circle-fill"></i></button>
                                        <div style={{overflowWrap: 'break-word', wordBreak: 'break-word'}}>{item.a}</div>
                                    </motion.div>
                                ) : (
                                    <div className="piece ans-card is-matched">
                                        ✅ <small className="opacity-75">{item.a}</small>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* QR Modal & Success Modal (คงเดิม) */}
            <AnimatePresence>
                {showQR && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="qr-overlay" onClick={() => setShowQR(false)}>
                        <motion.div className="glass-card p-3 text-center bg-dark text-white" style={{maxWidth: '300px'}} onClick={e => e.stopPropagation()}>
                            <h6 className="mb-3">สแกนเพื่อเข้าเล่น</h6>
                            <div className="bg-white p-2 d-inline-block rounded-3 mb-3">
                                <QRCodeCanvas value={currentUrl} size={180} />
                            </div>
                            <button className="btn btn-sm btn-outline-light w-100 rounded-pill" onClick={() => setShowQR(false)}>ปิด</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
             <AnimatePresence>
                {score === 10 && (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="position-fixed top-50 start-50 translate-middle glass-card text-center bg-success p-4 shadow-lg" style={{ zIndex: 3000, width: '85%', maxWidth: '350px' }}>
                        <h2 className="fw-bold mb-2">ยินดีด้วย!</h2>
                        <p className="small mb-3">คุณจับคู่ได้ถูกต้องครบ 10 ข้อ</p>
                        <button className="btn btn-sm btn-light w-100 rounded-pill" onClick={initGame}>เล่นใหม่</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}