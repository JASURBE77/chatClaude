import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../lib/socket';

export type CallState =
  | { status: 'idle' }
  | { status: 'calling';  targetUserId: string; targetName: string }
  | { status: 'incoming'; callerId: string;     callerName: string; offer: RTCSessionDescriptionInit }
  | { status: 'active';   remoteUserId: string; remoteName: string; duration: number };

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useCall() {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMuted, setIsMuted]     = useState(false);

  // Refs — avoid stale closures in socket handlers
  const callStateRef    = useRef<CallState>({ status: 'idle' });
  const pcRef           = useRef<RTCPeerConnection | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef     = useRef(0);

  // Keep ref in sync with state
  const updateCallState = (next: CallState) => {
    callStateRef.current = next;
    setCallState(next);
  };

  const socket = getSocket();

  /* ─── cleanup ─────────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    durationRef.current = 0;
    setIsMuted(false);
  }, []);

  /* ─── create RTCPeerConnection ────────────────────────────────── */
  const createPC = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('iceCandidate', { targetUserId: remoteUserId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (el && streams[0]) el.srcObject = streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const s = callStateRef.current;
        const remoteId = s.status === 'active' ? s.remoteUserId
                       : s.status === 'calling' ? s.targetUserId : null;
        if (remoteId) socket.emit('endCall', { targetUserId: remoteId });
        updateCallState({ status: 'idle' });
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, cleanup]);

  /* ─── start outgoing call ─────────────────────────────────────── */
  const startCall = useCallback(async (targetUserId: string, targetName: string) => {
    if (callStateRef.current.status !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPC(targetUserId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', { targetUserId, offer, callerName: '' });
      updateCallState({ status: 'calling', targetUserId, targetName });
    } catch (err) {
      console.error('startCall error', err);
      updateCallState({ status: 'idle' });
      cleanup();
    }
  }, [createPC, socket, cleanup]);

  /* ─── accept incoming call ────────────────────────────────────── */
  const acceptCall = useCallback(async () => {
    const s = callStateRef.current;
    if (s.status !== 'incoming') return;
    const { callerId, callerName, offer } = s;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPC(callerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answerCall', { callerId, answer });

      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setCallState((prev) =>
          prev.status === 'active' ? { ...prev, duration: durationRef.current } : prev,
        );
      }, 1000);

      updateCallState({ status: 'active', remoteUserId: callerId, remoteName: callerName, duration: 0 });
    } catch (err) {
      console.error('acceptCall error', err);
      socket.emit('rejectCall', { callerId });
      updateCallState({ status: 'idle' });
      cleanup();
    }
  }, [createPC, socket, cleanup]);

  /* ─── reject incoming call ────────────────────────────────────── */
  const rejectCall = useCallback(() => {
    const s = callStateRef.current;
    if (s.status !== 'incoming') return;
    socket.emit('rejectCall', { callerId: s.callerId });
    updateCallState({ status: 'idle' });
    cleanup();
  }, [socket, cleanup]);

  /* ─── end call (active or calling) ───────────────────────────── */
  const endCall = useCallback(() => {
    const s = callStateRef.current;
    const remoteId = s.status === 'active'  ? s.remoteUserId
                   : s.status === 'calling' ? s.targetUserId : null;
    if (remoteId) socket.emit('endCall', { targetUserId: remoteId });
    updateCallState({ status: 'idle' });
    cleanup();
  }, [socket, cleanup]);

  /* ─── mute toggle ─────────────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  /* ─── socket listeners (mounted once) ────────────────────────── */
  useEffect(() => {
    socket.on('incomingCall', (data: { callerId: string; callerName: string; offer: RTCSessionDescriptionInit }) => {
      if (callStateRef.current.status !== 'idle') {
        // Busy — auto-reject
        socket.emit('rejectCall', { callerId: data.callerId });
        return;
      }
      updateCallState({ status: 'incoming', ...data });
    });

    socket.on('callAnswered', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch { return; }

      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setCallState((prev) =>
          prev.status === 'active' ? { ...prev, duration: durationRef.current } : prev,
        );
      }, 1000);

      const s = callStateRef.current;
      if (s.status === 'calling') {
        updateCallState({ status: 'active', remoteUserId: s.targetUserId, remoteName: s.targetName, duration: 0 });
      }
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

    socket.on('iceCandidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch { /* ignore */ }
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAnswered');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('callFailed');
      socket.off('iceCandidate');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once — use refs inside handlers

  return { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, isMuted };
}
