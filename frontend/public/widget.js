// COURTIA Embeddable Widget
(function() {
  const container = document.createElement('div')
  container.id = 'courtia-widget'
  container.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;width:350px;height:500px;background:#0f172a;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);z-index:9999">
      <div style="padding:20px;background:linear-gradient(to right,#0891b2,#06b6d4);color:white;border-radius:12px 12px 0 0;font-weight:bold">
        COURTIA - Chat with ARK
      </div>
      <div id="chat-area" style="height:380px;overflow-y:auto;padding:20px;background:#1e293b"></div>
      <input type="text" id="chat-input" placeholder="Message..." style="width:100%;padding:10px;border:none;background:#0f172a;color:white">
    </div>
  `
  document.body.appendChild(container)
  
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const msg = e.target.value
      document.getElementById('chat-area').innerHTML += `<p style="color:#94a3b8;margin:10px 0">${msg}</p>`
      e.target.value = ''
    }
  })
})()
