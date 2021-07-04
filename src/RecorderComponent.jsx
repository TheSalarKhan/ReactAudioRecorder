import { useEffect, useRef, useState } from "react";
import { ReactMediaRecorder } from "./react-media-recorder";
import styles from "./RecorderComponent.module.css";

function RecordIcon({active=false}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" fill={active?"#FF0000":"#000000"}>
      <path d="M0 0h24v24H0V0z" fill="none"/>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>
  );
}

function PlayIcon({active=false}) {
  return (
    active ? 
      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="24px" fill="#000000">
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path d="M16 8v8H8V8h8m2-2H6v12h12V6z"/>
      </svg> :
      <svg xmlns="http://www.w3.org/2000/svg" height="20px" enable-background="new 0 0 24 24" viewBox="0 0 24 24" fill="#000000">
        <g>
          <rect fill="none" height="24" width="24"/>
        </g>
        <g>
          <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M9.5,16.5l7-4.5l-7-4.5V16.5z"/>
        </g>
      </svg>
  );
}

export const RecorderComponent = ({ deviceId }) => {
  const audioElement = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);

  const playRecording = () => {
    audioElement.current.play();
  }

  const stopPlaying = () => {
    audioElement.current.pause();
  }

  return (
    <div>
      <ReactMediaRecorder
        audio={(deviceId ? { deviceId } : true)}
        video={false}
        render={({
          status,
          startRecording,
          stopRecording,
          mediaBlobUrl,
        }) => {
            return (
              <div className={styles.mainContainer}>
                <div className={styles.button} onClick={ recording ? undefined : (playing ? stopPlaying : playRecording) }>
                  <PlayIcon active={playing}/>
                </div>
                <div className={styles.button} onClick={ 
                    recording ?
                    () => { stopRecording(); setRecording(false); }:
                    () => { startRecording(); setRecording(true); } }>
                  <RecordIcon active={recording}/>
                </div>
                <audio src={mediaBlobUrl} ref={e => {
                    if(e) {
                      audioElement.current = e;
                      e.onpause = () => {
                        e.currentTime = 0;
                        setPlaying(false);
                      }
                      e.onended = () => {
                        setPlaying(false);
                      }
                      e.onplaying = () => {
                        setPlaying(true);
                      }
                    }
                  }} />
              </div>
            );
        }}
      />
    </div>
  );
};