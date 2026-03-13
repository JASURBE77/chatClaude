import { useEffect, useState } from 'react';
import { useChatStore, type Room } from '../store/chatStore';
import api from '../lib/api';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useSocket } from '../hooks/useSocket';
import { useCall } from '../hooks/useCall';
import CallModal from '../components/chat/CallModal';
import { MessageOutlined } from '@ant-design/icons';

export default function ChatPage() {
  const { setRooms, activeRoom, setActiveRoom, setUserOnline } = useChatStore();
  const [showSidebar, setShowSidebar] = useState(true);

  useSocket();

  // Global call handler — active regardless of which chat is open
  const { callState, startCall, acceptCall, rejectCall, endCall, toggleMute, isMuted, toggleSpeaker, isSpeaker } = useCall();

  useEffect(() => {
    api.get('/chat/rooms').then((res) => {
      setRooms(res.data);
      // DB dagi isOnline ma'lumotidan boshlang'ich holat
      res.data.forEach((room: any) => {
        room.members?.forEach((m: any) => {
          if (m.isOnline) setUserOnline(m._id, true);
        });
      });
    });
  }, []);

  const handleSelectRoom = (room: Room) => {
    setActiveRoom(room);
    setShowSidebar(false);
  };

  return (
    <div className="flex app-height overflow-hidden" style={{ background: '#e8edf2' }}>
      {/* Global call modal — shows incoming call from anyone, anywhere */}
      <CallModal
        callState={callState}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        isMuted={isMuted}
        onToggleSpeaker={toggleSpeaker}
        isSpeaker={isSpeaker}
      />
      <audio id="remote-audio" autoPlay playsInline style={{ display: 'none' }} />
      {/* === SIDEBAR === */}
      <div
        className={`
          flex-col flex-shrink-0 h-full overflow-hidden
          transition-all duration-300 ease-in-out
          ${showSidebar ? 'flex' : 'hidden md:flex'}
          w-full sm:w-80 md:w-80 lg:w-[360px] xl:w-[400px]
        `}
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.08)' }}
      >
        <Sidebar onSelectRoom={handleSelectRoom} />
      </div>

      {/* === CHAT AREA === */}
      <div
        className={`
          flex-1 flex flex-col h-full min-w-0
          ${!showSidebar || 'hidden md:flex'}
        `}
      >
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            onBack={() => { setShowSidebar(true); setActiveRoom(null); }}
            onStartCall={startCall}
          />
        ) : (
          /* Empty state - desktop only */
          <div className="flex-1 flex flex-col items-center justify-center chat-bg h-full">
            <div className="text-center bg-white/85 backdrop-blur-sm rounded-3xl px-12 py-12 shadow-2xl mx-4"
              style={{ maxWidth: 380 }}>
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }}
              >
                <MessageOutlined style={{ fontSize: 44, color: 'white' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">TeleChat</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Select a chat from the sidebar or start a new conversation
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  End-to-end encrypted
                </div>
                <div className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Real-time
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
