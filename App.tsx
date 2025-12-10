import { useState } from 'react'

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'white' }}>
      <h1>VSP Group</h1>
      <p>App is working!</p>
      <button style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px', cursor: 'pointer' }} onClick={() => alert('Hello!')}>
        Test Button
      </button>
    </div>
  )
}

export default App
