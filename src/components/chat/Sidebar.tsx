import { useState } from 'react';
import { Avatar, Dropdown } from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useChatStore, type Room } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { disconnectSocket } from '../../lib/socket';
import { useNavigate } from 'react-router-dom';
import NewChatModal from './NewChatModal';

dayjs.extend(relativeTime);

const AVATAR_COLORS = [
  '#F44336','#E91E63','#9C27B0','#673AB7',
  '#3F51B5','#2196F3','#00BCD4','#009688',
  '#4CAF50','#FF9800','#FF5722',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface SidebarProps {
  onSelectRoom: (room: Room) => void;
}

export default function Sidebar({ onSelectRoom }: SidebarProps) {
  const { rooms, activeRoom, onlineUsers } = useChatStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  const filteredRooms = rooms.filter((r) => {
    const name = getRoomName(r, user?._id || '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function getRoomName(room: Room, myId: string) {
    if (room.type === 'group') return room.name;
    const other = room.members.find((m) => String(m._id) !== String(myId));
    return other?.username || 'Unknown';
  }

  function getRoomAvatar(room: Room, myId: string) {
    if (room.type === 'group') return null;
    const other = room.members.find((m) => String(m._id) !== String(myId));
    return other?.avatar || null;
  }

  function isRoomOnline(room: Room, myId: string) {
    if (room.type === 'group') return false;
    const other = room.members.find((m) => String(m._id) !== String(myId));
    return other ? onlineUsers.has(String(other._id)) : false;
  }

  function getLastMessagePreview(room: Room) {
    if (!room.lastMessage) return <span className="text-gray-400 italic text-xs">No messages yet</span>;
    if (room.lastMessage.isDeleted) return <span className="italic text-gray-400 text-xs">Message deleted</span>;
    const isMe = room.lastMessage.sender?._id === user?._id;
    return (
      <span className="text-xs text-gray-500 truncate">
        {isMe && <span className="text-[#2AABEE] font-medium">You: </span>}
        {room.lastMessage.content}
      </span>
    );
  }

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#fff' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }}
      >
        <Dropdown
          menu={{
            items: [
              { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
              { type: 'divider' },
              { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout },
            ],
          }}
          trigger={['click']}
        >
          <div className="relative cursor-pointer">
            <Avatar
              src={user?.avatar || undefined}
              size={38}
              style={{ background: avatarColor(user?.username || 'U'), fontWeight: 700 }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </div>
        </Dropdown>

        <span className="font-bold text-white text-base tracking-wide" style={{ letterSpacing: 0.5 }}>
          TeleChat
        </span>

        <button
          onClick={() => setNewChatOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="New Chat"
        >
          <EditOutlined style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2">
          <SearchOutlined className="text-gray-400" style={{ fontSize: 15 }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #2AABEE22, #229ED922)' }}>
              <EditOutlined style={{ fontSize: 26, color: '#2AABEE' }} />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No chats yet</p>
            <p className="text-gray-400 text-xs mb-3">Start a conversation with someone</p>
            <button
              onClick={() => setNewChatOpen(true)}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }}
            >
              New Chat
            </button>
          </div>
        )}

        {filteredRooms.map((room) => {
          const name = getRoomName(room, user?._id || '');
          const avatar = getRoomAvatar(room, user?._id || '');
          const online = isRoomOnline(room, user?._id || '');
          const preview = getLastMessagePreview(room);
          const isActive = activeRoom?._id === room._id;
          const color = avatarColor(name);

          return (
            <div
              key={room._id}
              onClick={() => onSelectRoom(room)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all border-b border-gray-50 ${
                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={avatar || undefined}
                  size={50}
                  style={{ background: color, fontWeight: 700, fontSize: 18 }}
                >
                  {room.type === 'group'
                    ? <TeamOutlined />
                    : name[0]?.toUpperCase()}
                </Avatar>
                {online && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`font-semibold text-sm truncate ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                    {name}
                  </span>
                  {room.lastMessage && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                      {dayjs(room.lastMessage.createdAt).fromNow(true)}
                    </span>
                  )}
                </div>
                <div className="truncate mt-0.5">{preview}</div>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="w-1 h-8 rounded-full" style={{ background: '#2AABEE' }} />
              )}
            </div>
          );
        })}
      </div>

      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </div>
  );
}
