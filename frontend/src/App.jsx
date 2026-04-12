import { useState } from 'react'
import './App.css'
import { Palette } from './components/Palette/Palette'
import { ReactFlowProvider } from '@xyflow/react'

function App() {

  return (
    <ReactFlowProvider>
      <Palette />
    </ReactFlowProvider>
    
  )
}

export default App
