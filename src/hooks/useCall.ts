import { useState, useRef, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

// CJS/ESM interop: Vite ba'zan default export'ni boshqacha beradi
const Peer: typeof SimplePeer = (SimplePeer as any).default ?? SimplePeer;

// Har qo'ng'iroqda Xirsys'dan yangi vaqtinchalik tokenlar olinadi
async function fetchIceConfig(): Promise<RTCConfiguration> {
  try {
    const { data } = await api.get<RTCIceServer[]>('/chat/ice-servers');
    if (!data || data.length === 0) throw new Error('Empty ICE servers response');
    console.log('[ICE] Servers loaded:', data.length, 'servers');
    return { iceServers: data };
  } catch (err) {
    console.warn('[ICE] Fetch failed, using fallback STUN:', err);
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }
}

export type CallState =
  | { status: 'idle' }
  | { status: 'calling';    targetUserId: string; targetName: string }
  | { status: 'incoming';   callerId: string; callerName: string; signal: SimplePeer.SignalData }
  | { status: 'connecting'; remoteUserId: string; remoteName: string }
  | { status: 'active';     remoteUserId: string; remoteName: string; duration: number };

export function useCall() {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMuted, setIsMuted]     = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const { user } = useAuthStore();

  const callStateRef      = useRef<CallState>({ status: 'idle' });
  const peerRef           = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef    = useRef<MediaStream | null>(null);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef       = useRef(0);

  const socket = getSocket();

  const updateCallState = (next: CallState) => {
    callStateRef.current = next;
    setCallState(next);
  };

  const getRemoteId = (s: CallState): string | null => {
    if (s.status === 'active')     return s.remoteUserId;
    if (s.status === 'connecting') return s.remoteUserId;
    if (s.status === 'calling')    return s.targetUserId;
    return null;
  };

  /* ─── cleanup ──────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    if (timerRef.current)    { clearInterval(timerRef.current); timerRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
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
      const [stream, iceConfig] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        fetchIceConfig(),
      ]);
      localStreamRef.current = stream;

      // trickle: true — ICE candidate'lar gather bo'lguncha kutmaymiz,
      // birinchi signal (offer) darhol yuboriladi. Bu TURN bilan ancha tez ishlaydi.
      const peer = new Peer({ initiator: true, trickle: true, stream, config: iceConfig });
      peerRef.current = peer;

      let offerSent = false;
      peer.on('signal', (signal) => {
        if (!offerSent) {
          // Birinchi signal — offer (SDP). Qo'ng'iroqni boshlaymiz.
          offerSent = true;
          socket.emit('callUser', { targetUserId, signal, callerName: user?.username || '' });
        } else {
          // Keyingi signallar — trickle ICE candidate'lar
          socket.emit('callTrickle', { targetUserId, candidate: signal });
        }
      });

      peer.on('stream', (remoteStream) => {
        const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
        if (el) el.srcObject = remoteStream;
      });

      peer.on('connect', () => {
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        startTimer();
        updateCallState({ status: 'active', remoteUserId: targetUserId, remoteName: targetName, duration: 0 });
      });

      peer.on('close', () => {
        const rid = getRemoteId(callStateRef.current);
        if (rid) socket.emit('endCall', { targetUserId: rid });
        updateCallState({ status: 'idle' });
        cleanup();
      });

      peer.on('error', (err: Error) => {
        console.error('[WebRTC] Peer error:', err);
        alert(`Qo'ng'iroqda xato: ${err?.message || 'Aloqa o\'rnatilmadi. Xirsys TURN server sozlamalarini tekshiring.'}`);
        const rid = getRemoteId(callStateRef.current);
        if (rid) socket.emit('endCall', { targetUserId: rid });
        updateCallState({ status: 'idle' });
        cleanup();
      });

      updateCallState({ status: 'calling', targetUserId, targetName });

      // 35 soniyadan keyin javob bo'lmasa avtomatik bekor qilamiz
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current.status === 'calling' || callStateRef.current.status === 'connecting') {
          alert(`Qo'ng'iroqqa javob yo'q (35 soniya). Foydalanuvchi band yoki ulanish o'rnatilmadi.`);
          socket.emit('endCall', { targetUserId });
          updateCallState({ status: 'idle' });
          cleanup();
        }
      }, 35000);

    } catch (err: any) {
      console.error('[startCall] error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert("Mikrofon ruxsati rad etildi. Brauzer sozlamalarida mikrofon ruxsatini bering.");
      } else if (err?.name === 'NotFoundError') {
        alert("Mikrofon topilmadi. Qurilmangizda mikrofon borligini tekshiring.");
      } else {
        alert(`Qo'ng'iroq boshlashda xato: ${err?.message || err}`);
      }
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
      const [stream, iceConfig] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        fetchIceConfig(),
      ]);
      localStreamRef.current = stream;

      updateCallState({ status: 'connecting', remoteUserId: callerId, remoteName: callerName });

      const peer = new Peer({ initiator: false, trickle: true, stream, config: iceConfig });
      peerRef.current = peer;

      let answerSent = false;
      peer.on('signal', (answerSignal) => {
        if (!answerSent) {
          // Birinchi signal — answer (SDP)
          answerSent = true;
          socket.emit('answerCall', { callerId, signal: answerSignal });
        } else {
          // Trickle ICE candidate'lar
          socket.emit('callTrickle', { targetUserId: callerId, candidate: answerSignal });
        }
      });

      peer.on('stream', (remoteStream) => {
        const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
        if (el) el.srcObject = remoteStream;
      });

      peer.on('connect', () => {
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        startTimer();
        updateCallState({ status: 'active', remoteUserId: callerId, remoteName: callerName, duration: 0 });
      });

      peer.on('close', () => {
        const rid = getRemoteId(callStateRef.current);
        if (rid) socket.emit('endCall', { targetUserId: rid });
        updateCallState({ status: 'idle' });
        cleanup();
      });

      peer.on('error', (err: Error) => {
        console.error('[WebRTC] Peer error (callee):', err);
        alert(`Qo'ng'iroqda xato: ${err?.message || 'Aloqa o\'rnatilmadi. Xirsys TURN server sozlamalarini tekshiring.'}`);
        const rid = getRemoteId(callStateRef.current);
        if (rid) socket.emit('endCall', { targetUserId: rid });
        updateCallState({ status: 'idle' });
        cleanup();
      });

      // Caller'ning offer signal'ini beramiz
      const signalToUse: SimplePeer.SignalData =
        (signal as any).sdp && !(signal as any).type
          ? { ...(signal as any), type: 'offer' }
          : signal;
      peer.signal(signalToUse);

      // 35 soniya ichida ulanmasa xato ko'rsatamiz
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current.status === 'connecting') {
          alert(`Ulanish o'rnatilmadi (35 soniya). Xirsys TURN server sozlamalarini tekshiring.`);
          const rid = getRemoteId(callStateRef.current);
          if (rid) socket.emit('endCall', { targetUserId: rid });
          updateCallState({ status: 'idle' });
          cleanup();
        }
      }, 35000);

    } catch (err: any) {
      console.error('[acceptCall] error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert("Mikrofon ruxsati rad etildi. Brauzer sozlamalarida mikrofon ruxsatini bering.");
      } else if (err?.name === 'NotFoundError') {
        alert("Mikrofon topilmadi. Qurilmangizda mikrofon borligini tekshiring.");
      } else {
        alert(`Qo'ng'iroqni qabul qilishda xato: ${err?.message || err}`);
      }
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
    const rid = getRemoteId(callStateRef.current);
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
    socket.on('incomingCall', (data: { callerId: string; callerName: string; signal: SimplePeer.SignalData }) => {
      if (callStateRef.current.status !== 'idle') {
        socket.emit('rejectCall', { callerId: data.callerId });
        return;
      }
      updateCallState({ status: 'incoming', ...data });
    });

    // Callee qabul qildi — caller connecting holatiga o'tadi
    socket.on('callAnswered', ({ signal }: { signal: SimplePeer.SignalData }) => {
      const s = callStateRef.current;
      if (s.status === 'calling') {
        updateCallState({ status: 'connecting', remoteUserId: s.targetUserId, remoteName: s.targetName });
      }
      peerRef.current?.signal(signal);
    });

    // Trickle ICE candidate keldi — peer'ga beramiz
    socket.on('callTrickle', ({ candidate }: { candidate: any }) => {
      if (peerRef.current) {
        try {
          peerRef.current.signal(candidate);
        } catch (e) {
          console.warn('[callTrickle] signal error:', e);
        }
      }
    });

    socket.on('callRejected', (data?: { by?: string }) => {
      alert(`Qo'ng'iroq rad etildi${data?.by ? ` (${data.by} tomonidan)` : ''}`);
      updateCallState({ status: 'idle' });
      cleanup();
    });

    socket.on('callEnded', () => {
      updateCallState({ status: 'idle' });
      cleanup();
    });

    socket.on('callFailed', (data?: { reason?: string }) => {
      alert(`Qo'ng'iroq amalga oshmadi: ${data?.reason || 'Foydalanuvchi offline yoki band'}`);
      updateCallState({ status: 'idle' });
      cleanup();
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAnswered');
      socket.off('callTrickle');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('callFailed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, isMuted, toggleSpeaker, isSpeaker };
}
