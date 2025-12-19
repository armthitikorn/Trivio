export default function PlayerLayout({ children }) {
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f0f2f5", // สีพื้นหลังรอง
      fontFamily: "'Inter', sans-serif" 
    }}>
      {/* เราไม่ใส่ Sidebar ตรงนี้ 
         เพื่อให้เนื้อหา (children) แสดงเต็มจอ 
         เหมาะสำหรับการเล่นเกมบนมือถือ 
      */}
      
      {/* ถ้าอยากได้ Header เล็กๆ ด้านบน สามารถใส่ตรงนี้ได้ */}
      {/* <header style={{ padding: '10px', textAlign: 'center', background: 'white' }}>TRIVIO PLAYER</header> */}

      <main>
        {children}
      </main>
    </div>
  )
}