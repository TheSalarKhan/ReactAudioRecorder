import { useState } from 'react';
import { RecorderComponent } from './RecorderComponent';

function App() {
  const [ showRecorder, setShowRecorder ] = useState(false);
  return (
    <div>
        <button onClick={()=> { setShowRecorder(!showRecorder) }}>toggle view</button>
        {showRecorder && <RecorderComponent />}
    </div>
  );
}

export default App;
