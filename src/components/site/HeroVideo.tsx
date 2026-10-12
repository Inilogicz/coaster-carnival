'use client';

import { useEffect, useRef } from 'react';
import type { EventContent } from '@/lib/content';

type HlsInstance = {
  destroy(): void;
  on(event: string, cb: (...args: never[]) => void): void;
  loadSource(src: string): void;
  attachMedia(el: HTMLMediaElement): void;
};
type HlsStatic = {
  new (config: Record<string, unknown>): HlsInstance;
  isSupported(): boolean;
  Events: Record<string, string>;
};
declare global {
  interface Window {
    Hls?: HlsStatic;
  }
}

let hlsLoader: Promise<void> | null = null;
function loadHls() {
  hlsLoader ??= new Promise<void>((resolve) => {
    if (window.Hls) return resolve();
    const script = document.createElement('script');
    script.src = '/assets/vendor/hls.min.js';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.append(script);
  });
  return hlsLoader;
}

const isPlaylist = (src: string) => /\.m3u8(\?|$)/i.test(src);

/**
 * Port of the original hero film: HLS (phone/desktop, HDR with SDR fallback), muted video,
 * and a separate looping soundtrack that survives buffering and video loops.
 */
export function HeroVideo({ hero }: { hero: EventContent['hero'] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const soundRef = useRef<HTMLButtonElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const heroVideo = videoRef.current!;
    const pauseVideo = pauseRef.current!;
    const soundVideo = soundRef.current!;
    const soundHint = hintRef.current!;
    const cleanups: Array<() => void> = [];
    const listen = <T extends EventTarget>(target: T, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    };
    let disposed = false;
    let streamPlayer: HlsInstance | undefined;
    const soundtrack = document.createElement('audio');

    (async () => {
      await loadHls();
      if (disposed) return;
      const Hls = window.Hls;
      const filmLayout = window.matchMedia('(max-width: 600px)').matches ? 'phone' : 'desktop';
      const sources = {
        standard: filmLayout === 'phone' ? hero.video.phone : hero.video.desktop,
        hdr: filmLayout === 'phone' ? hero.video.phoneHdr : hero.video.desktopHdr,
      };
      const streaming = isPlaylist(sources.standard);
      const nativeHLS = !Hls?.isSupported() && Boolean(heroVideo.canPlayType('application/vnd.apple.mpegurl'));
      const canStream = !streaming || nativeHLS || Boolean(Hls?.isSupported());
      const hdrCodec = 'video/mp4; codecs="hvc1.2.4.L120.B0"';
      const supportsHDR =
        streaming && Boolean(sources.hdr) &&
        (nativeHLS ? Boolean(heroVideo.canPlayType(hdrCodec)) : Boolean(window.MediaSource?.isTypeSupported(hdrCodec)));
      let playingHDR = false;

      function attachFilm(hdr: boolean) {
        playingHDR = hdr;
        heroVideo.dataset.filmColour = hdr ? 'hdr' : 'standard';
        if (hdr) {
          const t = setTimeout(() => {
            if (playingHDR && heroVideo.readyState === 0) attachFilm(false);
          }, 30000);
          cleanups.push(() => clearTimeout(t));
        }
        const playlist = hdr ? sources.hdr : sources.standard;
        if (!streaming || nativeHLS) {
          heroVideo.src = playlist;
        } else if (Hls?.isSupported()) {
          streamPlayer?.destroy();
          streamPlayer = new Hls({
            videoPreference: { preferHDR: hdr, allowedVideoRanges: hdr ? ['HLG'] : ['SDR'] },
            enableWorker: false,
            maxBufferLength: 20,
            maxMaxBufferLength: 60,
            backBufferLength: Infinity,
          });
          streamPlayer.on(Hls.Events.MANIFEST_PARSED, startFilm);
          streamPlayer.on(Hls.Events.FRAG_LOADED, () => {
            heroVideo.dataset.streamLoaded = 'true';
          });
          streamPlayer.on(Hls.Events.ERROR, ((_event: unknown, data: { details: string; fatal: boolean; reason?: string; error?: Error }) => {
            heroVideo.dataset.streamError = `${data.details}: ${data.error?.message || data.reason || ''}`;
            if (data.fatal && playingHDR) attachFilm(false);
          }) as never);
          streamPlayer.loadSource(playlist);
          streamPlayer.attachMedia(heroVideo);
        }
      }
      listen(heroVideo, 'error', () => {
        if (playingHDR) attachFilm(false);
      });

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const registering = () => location.hash === '#register';
      let playbackRun = 0;
      let soundWanted = true;
      soundtrack.id = 'hero-soundtrack';
      soundtrack.src = hero.soundtrack;
      soundtrack.hidden = true;
      heroVideo.parentElement!.append(soundtrack);
      soundtrack.preload = 'auto';
      soundtrack.volume = 1;
      soundtrack.loop = true;
      heroVideo.muted = true;
      heroVideo.loop = true;

      async function startMusic() {
        if (!hero.soundtrack || !soundWanted || heroVideo.paused || registering() || document.hidden || reducedMotion.matches) return;
        try {
          await soundtrack.play();
        } catch {
          /* Retry on the first visitor interaction if autoplay is blocked. */
        }
        syncVideoControls();
      }
      function syncVideoControls() {
        if (!canStream || !hero.soundtrack) {
          soundVideo.hidden = true;
          soundHint.hidden = true;
          return;
        }
        pauseVideo.textContent = heroVideo.paused ? 'Play video' : 'Pause video';
        const on = soundWanted && !soundtrack.paused;
        soundVideo.textContent = on ? 'Mute sound' : 'Enable sound';
        soundVideo.hidden = false;
        soundVideo.setAttribute('aria-pressed', String(on));
        soundHint.hidden = on || reducedMotion.matches || registering();
      }
      async function startFilm() {
        if (!canStream) {
          syncVideoControls();
          return;
        }
        const run = ++playbackRun;
        if (registering() || document.hidden || reducedMotion.matches) {
          heroVideo.pause();
          soundtrack.pause();
          syncVideoControls();
          return;
        }
        heroVideo.muted = true;
        try {
          await heroVideo.play();
        } catch {
          syncVideoControls();
          return;
        }
        if (run !== playbackRun || registering()) {
          heroVideo.pause();
          soundtrack.pause();
          return;
        }
        if (soundWanted && soundtrack.paused) await startMusic();
        syncVideoControls();
      }

      listen(pauseVideo, 'click', async () => {
        playbackRun++;
        if (heroVideo.paused) {
          try {
            await heroVideo.play();
          } catch {
            heroVideo.muted = true;
            try {
              await heroVideo.play();
            } catch {}
          }
        } else heroVideo.pause();
        syncVideoControls();
      });
      listen(soundVideo, 'click', async () => {
        if (soundWanted && !soundtrack.paused) {
          soundWanted = false;
          soundtrack.pause();
        } else {
          soundWanted = true;
          heroVideo.muted = true;
          // Start audio directly inside the user's tap to satisfy browser sound policies.
          const musicStart = soundtrack.play();
          try {
            await heroVideo.play();
            await musicStart;
          } catch {
            soundWanted = false;
            soundtrack.pause();
          }
        }
        syncVideoControls();
      });
      listen(heroVideo, 'playing', () => {
        if (soundWanted && soundtrack.paused) startMusic();
      });
      listen(heroVideo, 'pause', () => {
        soundtrack.pause();
        syncVideoControls();
      });
      // Music runs independently so buffering and video loops cannot interrupt it.
      listen(document, 'click', (event) => {
        if ((event.target as Element).closest?.('#video-sound') || !soundWanted || !soundtrack.paused || document.hidden || registering() || reducedMotion.matches) return;
        soundtrack.play().then(syncVideoControls).catch(syncVideoControls);
      });
      listen(soundtrack, 'play', syncVideoControls);
      listen(soundtrack, 'pause', syncVideoControls);
      listen(soundtrack, 'error', () => {
        soundWanted = false;
        syncVideoControls();
      });
      listen(window, 'hashchange', () => {
        if (registering()) {
          playbackRun++;
          heroVideo.pause();
        } else if (heroVideo.paused) startFilm();
      });
      listen(document, 'visibilitychange', () => {
        if (document.hidden) {
          playbackRun++;
          heroVideo.pause();
        } else if (!registering()) startFilm();
      });
      if (reducedMotion.matches) heroVideo.autoplay = false;
      attachFilm(supportsHDR);
      if (!streaming || nativeHLS || !canStream) startFilm();
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      streamPlayer?.destroy();
      soundtrack.pause();
      soundtrack.remove();
    };
  }, [hero]);

  return (
    <div className="hero-film">
      <video
        ref={videoRef}
        id="hero-video"
        className="hero-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        poster={hero.poster}
        aria-label="Event highlights film"
      />
      <div className="hero-video-controls">
        <button ref={pauseRef} id="video-pause" type="button" aria-controls="hero-video">
          Pause video
        </button>
        <button ref={soundRef} id="video-sound" type="button" aria-controls="hero-video" aria-pressed="false">
          Enable sound
        </button>
        <span id="video-position" aria-live="polite">
          01 / 02
        </span>
      </div>
      <p ref={hintRef} id="sound-hint" className="sound-hint" role="status" hidden>
        {hero.soundHint}
      </p>
    </div>
  );
}
