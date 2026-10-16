declare const chrome: any;

function getYouTubeVideoId(): string {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch {
    // ignore
  }
  return "V1b8VxrkbZU";
}

function getVideoState(): {
  videoId: string;
  currentTime: number;
  paused: boolean;
  screenshotB64: string | null;
} {
  const video = document.querySelector("video") as HTMLVideoElement | null;
  const videoId = getYouTubeVideoId();
  if (!video) {
    return {
      videoId,
      currentTime: 29.0,
      paused: true,
      screenshotB64: null,
    };
  }

  let screenshotB64: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext("2d");
    if (ctx && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      screenshotB64 = dataUrl.split(",")[1] || null;
    }
  } catch {
    screenshotB64 = null;
  }

  return {
    videoId,
    currentTime: video.currentTime || 0,
    paused: video.paused,
    screenshotB64,
  };
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(
    (
      msg: { type?: string; timeSec?: number },
      _sender: unknown,
      sendResponse: (resp: unknown) => void
    ) => {
      if (msg?.type === "GET_VIDEO_STATE") {
        sendResponse(getVideoState());
        return true;
      }
      if (msg?.type === "SEEK_VIDEO" && typeof msg.timeSec === "number") {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        if (video) {
          video.currentTime = msg.timeSec;
        }
        sendResponse(getVideoState());
        return true;
      }
      return false;
    }
  );
}
