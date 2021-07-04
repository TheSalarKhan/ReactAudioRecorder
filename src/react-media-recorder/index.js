import { ReactElement, useCallback, useEffect, useRef, useState } from "react";

// export type ReactMediaRecorderRenderProps = {
//   error: string;
//   muteAudio: () => void;
//   unMuteAudio: () => void;
//   startRecording: () => void;
//   pauseRecording: () => void;
//   resumeRecording: () => void;
//   stopRecording: () => void;
//   mediaBlobUrl: null | string;
//   status: StatusMessages;
//   isAudioMuted: boolean;
//   previewStream: MediaStream | null;
//   clearBlobUrl: () => void;
// };

// export type ReactMediaRecorderHookProps = {
//   audio?: boolean | MediaTrackConstraints;
//   video?: boolean | MediaTrackConstraints;
//   screen?: boolean;
//   onStop?: (blobUrl: string, blob: Blob) => void;
//   blobPropertyBag?: BlobPropertyBag;
//   mediaRecorderOptions?: MediaRecorderOptions | null;
// };
// export type ReactMediaRecorderProps = ReactMediaRecorderHookProps & {
//   render: (props: ReactMediaRecorderRenderProps) => ReactElement;
// };

// export type StatusMessages =
//   | "media_aborted"
//   | "permission_denied"
//   | "no_specified_media_found"
//   | "media_in_use"
//   | "invalid_media_constraints"
//   | "no_constraints"
//   | "recorder_error"
//   | "idle"
//   | "acquiring_media"
//   | "delayed_start"
//   | "recording"
//   | "stopping"
//   | "stopped";

const RecorderErrors = {
  AbortError : "media_aborted",
  NotAllowedError : "permission_denied",
  NotFoundError : "no_specified_media_found",
  NotReadableError : "media_in_use",
  OverconstrainedError : "invalid_media_constraints",
  TypeError : "no_constraints",
  NONE : "",
  NO_RECORDER : "recorder_error",
}

export function useReactMediaRecorder({
  audio = true,
  video = false,
  onStop = () => null,
  blobPropertyBag,
  screen = false,
  mediaRecorderOptions = null,
}) {
  const mediaRecorder = useRef(null);
  const mediaChunks = useRef([]);
  const mediaStream = useRef(null);
  const [status, setStatus] = useState("idle");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState(null);
  const [error, setError] = useState("NONE");

  const getMediaStream = useCallback(async () => {
    setStatus("acquiring_media");
    const requiredMedia = {
      audio: typeof audio === "boolean" ? !!audio : audio,
      video: typeof video === "boolean" ? !!video : video,
    };
    try {
      if (screen) {
        //@ts-ignore
        const stream = (await window.navigator.mediaDevices.getDisplayMedia({
          video: video || true,
        }));
        if (audio) {
          const audioStream = await window.navigator.mediaDevices.getUserMedia({
            audio,
          });

          audioStream
            .getAudioTracks()
            .forEach((audioTrack) => stream.addTrack(audioTrack));
        }
        mediaStream.current = stream;
      } else {
        const stream = await window.navigator.mediaDevices.getUserMedia(
          requiredMedia
        );
        mediaStream.current = stream;
      }
      setStatus("idle");
    } catch (error) {
      setError(error.name);
      setStatus("idle");
    }
  }, [audio, video, screen]);

  useEffect(() => {
    if (!window.MediaRecorder) {
      throw new Error("Unsupported Browser");
    }

    if (screen) {
      //@ts-ignore
      if (!window.navigator.mediaDevices.getDisplayMedia) {
        throw new Error("This browser doesn't support screen capturing");
      }
    }

    const checkConstraints = (mediaType) => {
      const supportedMediaConstraints = navigator.mediaDevices.getSupportedConstraints();
      const unSupportedConstraints = Object.keys(mediaType).filter(
        (constraint) =>
          !(supportedMediaConstraints)[constraint]
      );

      if (unSupportedConstraints.length > 0) {
        console.error(
          `The constraints ${unSupportedConstraints.join(
            ","
          )} doesn't support on this browser. Please check your ReactMediaRecorder component.`
        );
      }
    };

    if (typeof audio === "object") {
      checkConstraints(audio);
    }
    if (typeof video === "object") {
      checkConstraints(video);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type you supplied for MediaRecorder doesn't support this browser`
        );
      }
    }

    // if (!mediaStream.current) {
    //   getMediaStream();
    // }
  }, [audio, screen, video, getMediaStream, mediaRecorderOptions]);

  useEffect(() => {
      return () => {
          if(mediaStream.current) {
              let tracks = mediaStream.current.getTracks();
              for(const t of tracks) {
                  t.stop();
              }
          }
      }
  }, [ mediaStream ]);
  // Media Recorder Handlers

  const startRecording = async () => {
    setError("NONE");
    if (!mediaStream.current) {
      await getMediaStream();
    }
    if (mediaStream.current) {
      const isStreamEnded = mediaStream.current
        .getTracks()
        .some((track) => track.readyState === "ended");
      if (isStreamEnded) {
        await getMediaStream();
      }
      mediaRecorder.current = new MediaRecorder(mediaStream.current);
      mediaRecorder.current.ondataavailable = onRecordingActive;
      mediaRecorder.current.onstop = onRecordingStop;
      mediaRecorder.current.onerror = () => {
        setError("NO_RECORDER");
        setStatus("idle");
      };
      mediaRecorder.current.start();
      setStatus("recording");
    }
  };

  const onRecordingActive = ({ data }) => {
    mediaChunks.current.push(data);
  };

  const onRecordingStop = () => {
    const [chunk] = mediaChunks.current;
    const blobProperty = Object.assign(
      { type: chunk.type },
      blobPropertyBag || (video ? { type: "video/mp4" } : { type: "audio/wav" })
    );
    const blob = new Blob(mediaChunks.current, blobProperty);
    const url = URL.createObjectURL(blob);
    setStatus("stopped");
    setMediaBlobUrl(url);
    onStop(url, blob);
  };

  const muteAudio = (mute) => {
    setIsAudioMuted(mute);
    if (mediaStream.current) {
      mediaStream.current
        .getAudioTracks()
        .forEach((audioTrack) => (audioTrack.enabled = !mute));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
    }
  };
  const resumeRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state !== "inactive") {
        setStatus("stopping");
        mediaRecorder.current.stop();
        mediaStream.current &&
          mediaStream.current.getTracks().forEach((track) => track.stop());
        mediaChunks.current = [];
      }
    }
  };

  return {
    error: RecorderErrors[error],
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    mediaBlobUrl,
    status,
    isAudioMuted,
    previewStream: mediaStream.current
      ? new MediaStream(mediaStream.current.getVideoTracks())
      : null,
    clearBlobUrl: () => setMediaBlobUrl(null),
  };
}

export const ReactMediaRecorder = (props) =>
  props.render(useReactMediaRecorder(props));
