'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PlayerLobby() {
  const { id } = useParams() // นี่คือ Session ID
  const router = useRouter()
  const [status, setStatus] = useState('รอโฮสต์กดเริ่มเกมนะ...')

  useEffect(() => {
    // --- 1. ฟังก์ชันรอฟังคำสั่งจากโฮสต์ ---
    const channel = supabase
      .channel(`player-lobby-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_sessions',
        filter: `id=eq.${id}` 
      }, (payload) => {
        // เมื่อโฮสต์อัปเดตสถานะห้อง
        console.log("สถานะห้องเปลี่ยนเป็น:", payload.new.current_state)
        
        if (payload.new.current_state === 'QUESTION') {
          // ถ้าโฮสต์เปลี่ยนเป็น QUESTION ให้พาคนเล่นไปหน้าทำข้อสอบทันที!
          router.push(`/play/game/${id}`)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: '#6f42c1', color: 'white', fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ fontSize: '2.5rem' }}>🎮 เข้าห้องสำเร็จ!</h1>
      <p style={{ fontSize: '1.5rem' }}>{status}</p>
      
      <div style={{ marginTop: '20px', padding: '15px 30px', background: 'rgba(255,255,255,0.2)', borderRadius: '15px' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>รหัสห้อง (Session):</p>
        <code style={{ fontSize: '14px' }}>{id}</code>
      </div>
      
      <div style={{
        marginTop: '40px', width: '60px', height: '60px', 
        border: '6px solid rgba(255,255,255,0.3)', borderTop: '6px solid #fff', 
        borderRadius: '50%', animation: 'spin 1s linear infinite'
      }}></div>

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}