import { useEffect, useRef, useState } from 'react';
import { Avatar } from 'antd';
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import { useChatStore, type Message, type Room } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const AVATAR_COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface Props {
  room: Room;
  onBack?: () => void;
  onStartCall: (targetUserId: string, targetName: string) => void;
}

export default function ChatWindow({ room, onBack, onStartCall }: Props) {
  const { messages, typingUsers, onlineUsers, setRoomMessages } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  const roomMessages = messages[room._id] || [];

  useEffect(() => {
    if (!messages[room._id]) {
      setLoading(true);
      api.get(`/chat/rooms/${room._id}/messages`).then((res) => {
        setRoomMessages(room._id, res.data);
        setLoading(false);
      });
    }
    socket.emit('joinRoom', { roomId: room._id });
  }, [room._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  const typing = typingUsers.filter((t) => t.roomId === room._id && t.userId !== user?._id);

  const getRoomDisplayName = () => {
    if (room.type === 'group') return room.name;
    const other = room.members.find((m) => m._id !== user?._id);
    return other?.username || 'Chat';
  };

  const getRoomAvatar = () => {
    if (room.type === 'group') return undefined;
    const other = room.members.find((m) => m._id !== user?._id);
    return other?.avatar;
  };

  const isOtherOnline = () => {
    if (room.type === 'group') return false;
    const other = room.members.find((m) => m._id !== user?._id);
    return other ? onlineUsers.has(other._id) : false;
  };

  const name = getRoomDisplayName();
  const color = avatarColor(name);

  // Get the other user for direct calls
  const otherUser = room.type === 'direct' ? room.members.find((m) => m._id !== user?._id) : null;

  const handleCall = () => {
    if (!otherUser) return;
    onStartCall(otherUser._id, otherUser.username);
  };

  const getStatusText = () => {
    if (typing.length > 0) return typing[0].username + ' is typing...';
    if (room.type === 'group') return `${room.members.length} members`;
    return isOtherOnline() ? 'online' : 'last seen recently';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shadow-md z-10"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all md:hidden"
          >
            <ArrowLeftOutlined />
          </button>
        )}

        <div className="relative flex-shrink-0">
          <Avatar src={getRoomAvatar()} size={42} style={{ background: color, fontWeight: 700, fontSize: 17 }}>
            {room.type === 'group' ? <TeamOutlined /> : name[0]?.toUpperCase()}
          </Avatar>
          {isOtherOnline() && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">{name}</h3>
          <p className={`text-xs leading-tight font-medium ${
            typing.length > 0 ? 'text-yellow-300' : isOtherOnline() ? 'text-green-400' : 'text-white/50'
          }`}>
            {getStatusText()}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* Phone call button - only for direct chats */}
          {room.type === 'direct' && otherUser && (
            <button
              onClick={handleCall}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all text-white/70 hover:text-white hover:bg-white/10"
              title="Voice Call"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages area with chat background */}
      <div className="flex-1 overflow-y-auto px-3 py-4 chat-bg" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex flex-col gap-4 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-white/60 animate-pulse flex-shrink-0" />}
                <div
                  className="rounded-2xl animate-pulse"
                  style={{
                    width: 120 + Math.random() * 100,
                    height: 50 + Math.random() * 30,
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(42,171,238,0.3)',
                  }}
                />
              </div>
            ))}
          </div>
        ) : roomMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="bg-white/80 rounded-2xl px-6 py-4 text-center shadow-sm">
              <p className="text-2xl mb-2">👋</p>
              <p className="font-semibold text-gray-700">Say hello!</p>
              <p className="text-sm text-gray-400">Send the first message</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {roomMessages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                roomId={room._id}
                onReply={setReplyTo}
              />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-end gap-2 mt-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: avatarColor(typing[0].username) }}
            >
              {typing[0].username[0]?.toUpperCase()}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput roomId={room._id} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
    </div>
  );
}
