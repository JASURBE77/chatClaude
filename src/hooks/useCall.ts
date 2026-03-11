import { useState, useRef, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

// CJS/ESM interop: Vite ba'zan default export'ni boshqacha beradi
const Peer: typeof SimplePeer = (SimplePeer as any).default ?? SimplePeer;

export type CallState =
  | { status: 'idle' }
  | { status: 'calling';  targetUserId: string; targetName: string }
  | { status: 'incoming'; callerId: string; callerName: string; signal: Peer.SignalData }
  | { status: 'active';   remoteUserId: string; remoteName: string; duration: number };

export function useCall() {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMuted, setIsMuted]     = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const { user } = useAuthStore();

  const callStateRef   = useRef<CallState>({ status: 'idle' });
  const peerRef        = useRef<Peer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef    = useRef(0);

  const socket = getSocket();

  const updateCallState = (next: CallState) => {
    callStateRef.current = next;
    setCallState(next);
  };

  /* ─── cleanup ──────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    durationRef.current = 0;
    setIsMuted(false);
    setIsSpeaker(false);
  }, []);

  /* ─── timer ────────────────────────────────────────────────── */
  const startTimer = useCallback(() => {
    durationRef.current = 0;
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setCallState((prev) =>
        prev.status === 'active' ? { ...prev, duration: durationRef.current } : prev,
      );
    }, 1000);
  }, []);

  /* ─── chiquvchi qo'ng'iroq ─────────────────────────────────── */
  const startCall = useCallback(async (targetUserId: string, targetName: string) => {
    if (callStateRef.current.status !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Qo'ng'iroq faqat HTTPS yoki localhost orqali ishlaydi");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const peer = new Peer({ initiator: true, trickle: false, stream });
      peerRef.current = peer;

      // simple-peer offer signal yaratadi — backendga yuboramiz
      peer.on('signal', (signal) => {
        socket.emit('callUser', {
          targetUserId,
          signal,
          callerName: user?.username || '',
        });
      });

      // Boshqa tomondan audio kelganda
      peer.on('stream', (remoteStream) => {
        const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
        if (el) el.srcObject = remoteStream;
      });

      // P2P ulanish o'rnatildi
      peer.on('connect', () => {
        startTimer();
        updateCallState({ status: 'active', remoteUserId: targetUserId, remoteName: targetName, duration: 0 });
      });

      peer.on('close', () => {
        const s = callStateRef.current;
        const rid = s.status === 'active' ? s.remoteUserId : s.status === 'calling' ? s.targetUserId : null;
        if (rid) socket.emit('endCall', { targetUserId: rid });
        updateCallState({ status: 'idle' });
        cleanup();
      });

      peer.on('error', () => {
        updateCallState({ status: 'idle' });
        cleanup();
      });

      updateCallState({ status: 'calling', targetUserId, targetName });
    } catch (err) {
      console.error('startCall error', err);
      updateCallState({ status: 'idle' });
      cleanup();
    }
  }, [socket, user, cleanup, startTimer]);

  /* ─── kiruvchi qo'ng'iroqni qabul qilish ──────────────────── */
  const acceptCall = useCallback(async () => {
    const s = callStateRef.current;
    if (s.status !== 'incoming') return;
    const { callerId, callerName, signal } = s;

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Qo'ng'iroq faqat HTTPS yoki localhost orqali ishlaydi");
      socket.emit('rejectCall', { callerId });
      updateCallState({ status: 'idle' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const peer = new Peer({ initiator: false, trickle: false, stream });
      peerRef.current = peer;

      // simple-peer answer signal yaratadi — backendga yuboramiz
      peer.on('signal', (answerSignal) => {
        socket.emit('answerCall', { callerId, signal: answerSignal });
      });

      peer.on('stream', (remoteStream) => {
        const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
        if (el) el.srcObject = remoteStream;
      });

      peer.on('connect', () => {
        startTimer();
        updateCallState({ status: 'active', remoteUserId: callerId, remoteName: callerName, duration: 0 });
      });

      peer.on('close', () => {
        updateCallState({ status: 'idle' });
        cleanup();
      });

      peer.on('error', () => {
        updateCallState({ status: 'idle' });
        cleanup();
      });

      // Caller'ning signal'ini beramiz — peer javob tayyorlaydi
      // Normalize: ba'zi brauzerlarda type null keladi, offer ekanligini aniq belgilaymiz
      const signalToUse: Peer.SignalData =
        (signal as any).sdp && !(signal as any).type
          ? { ...(signal as any), type: 'offer' }
          : signal;
      peer.signal(signalToUse);
    } catch (err) {
      console.error('acceptCall error', err);
      socket.emit('rejectCall', { callerId });
      updateCallState({ status: 'idle' });
      cleanup();
    }
  }, [socket, cleanup, startTimer]);

  /* ─── rad etish ─────────────────────────────────────────────── */
  const rejectCall = useCallback(() => {
    const s = callStateRef.current;
    if (s.status !== 'incoming') return;
    socket.emit('rejectCall', { callerId: s.callerId });
    updateCallState({ status: 'idle' });
    cleanup();
  }, [socket, cleanup]);

  /* ─── qo'ng'iroqni tugatish ─────────────────────────────────── */
  const endCall = useCallback(() => {
    const s = callStateRef.current;
    const rid = s.status === 'active' ? s.remoteUserId : s.status === 'calling' ? s.targetUserId : null;
    if (rid) socket.emit('endCall', { targetUserId: rid });
    updateCallState({ status: 'idle' });
    cleanup();
  }, [socket, cleanup]);

  /* ─── mute ──────────────────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  /* ─── speaker ───────────────────────────────────────────────── */
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (el) el.volume = next ? 1.0 : 0.5;
      return next;
    });
  }, []);

  /* ─── socket eventlar ───────────────────────────────────────── */
  useEffect(() => {
    // Kiruvchi qo'ng'iroq — signal + caller ma'lumotlari keladi
    socket.on('incomingCall', (data: { callerId: string; callerName: string; signal: Peer.SignalData }) => {
      if (callStateRef.current.status !== 'idle') {
        socket.emit('rejectCall', { callerId: data.callerId });
        return;
      }
      updateCallState({ status: 'incoming', ...data });
    });

    // Qo'ng'iroq qabul qilindi — answer signal keladi, peer'ga beramiz
    socket.on('callAnswered', ({ signal }: { signal: Peer.SignalData }) => {
      peerRef.current?.signal(signal);
    });

    socket.on('callRejected', () => {
      updateCallState({ status: 'idle' });
      cleanup();
    });

    socket.on('callEnded', () => {
      updateCallState({ status: 'idle' });
      cleanup();
    });

    socket.on('callFailed', () => {
      updateCallState({ status: 'idle' });
      cleanup();
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAnswered');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('callFailed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, isMuted, toggleSpeaker, isSpeaker };
}
