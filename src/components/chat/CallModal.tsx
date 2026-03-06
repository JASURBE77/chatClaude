import { useEffect } from 'react';
import { type CallState } from '../../hooks/useCall';

const AVATAR_COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

interface Props {
  callState: CallState;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export default function CallModal({ callState, onAccept, onReject, onEnd, onToggleMute, isMuted }: Props) {
  // Vibrate on incoming call
  useEffect(() => {
    if (callState.status === 'incoming') {
      if ('vibrate' in navigator) navigator.vibrate([500, 300, 500, 300, 500]);
    }
  }, [callState.status]);

  if (callState.status === 'idle') return null;

  const remoteName =
    callState.status === 'calling'
      ? callState.targetName
      : callState.status === 'incoming'
      ? callState.callerName
      : callState.remoteName;

  const color = avatarColor(remoteName);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="relative w-80 rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
        >
          {/* Sound waves animation */}
          {(callState.status === 'calling' || callState.status === 'incoming') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-white/10"
                  style={{
                    width: 120 + i * 60,
                    height: 120 + i * 60,
                    animation: `ping ${0.8 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-8 pt-12 pb-10">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4"
              style={{
                background: color,
                boxShadow: `0 0 0 4px rgba(255,255,255,0.1), 0 0 0 8px rgba(255,255,255,0.05)`,
              }}
            >
              {remoteName[0]?.toUpperCase()}
            </div>

            {/* Name */}
            <h2 className="text-white text-xl font-bold mb-1">{remoteName}</h2>

            {/* Status */}
            <p className="text-white/60 text-sm mb-10">
              {callState.status === 'calling' && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                  Calling...
                </span>
              )}
              {callState.status === 'incoming' && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Incoming voice call
                </span>
              )}
              {callState.status === 'active' && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {formatDuration(callState.duration)}
                </span>
              )}
            </p>

            {/* INCOMING: Accept / Reject */}
            {callState.status === 'incoming' && (
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onReject}
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ background: '#ef4444' }}
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                    </svg>
                  </button>
                  <span className="text-white/50 text-xs">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onAccept}
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ background: '#22c55e' }}
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                    </svg>
                  </button>
                  <span className="text-white/50 text-xs">Accept</span>
                </div>
              </div>
            )}

            {/* CALLING: Cancel */}
            {callState.status === 'calling' && (
              <button
                onClick={onEnd}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                style={{ background: '#ef4444' }}
              >
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                </svg>
              </button>
            )}

            {/* ACTIVE: Mute + End */}
            {callState.status === 'active' && (
              <div className="flex items-center gap-6 w-full justify-center">
                {/* Mute */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onToggleMute}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isMuted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {isMuted ? (
                      <svg viewBox="0 0 24 24" fill="#1a1a2e" className="w-6 h-6">
                        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                      </svg>
                    )}
                  </button>
                  <span className="text-white/50 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>

                {/* Speaker */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </button>
                  <span className="text-white/50 text-xs">Speaker</span>
                </div>

                {/* End call */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={onEnd}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ background: '#ef4444' }}
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                    </svg>
                  </button>
                  <span className="text-white/50 text-xs">End</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
