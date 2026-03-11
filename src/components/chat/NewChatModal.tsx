import { useState } from 'react';
import { Modal, Avatar, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewChatModal({ open, onClose }: NewChatModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (!value.trim()) { setUsers([]); return; }
    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${value}`);
      setUsers(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (targetUser: any) => {
    const socket = getSocket();
    socket.emit('openDirectChat', { targetUserId: targetUser._id });
    onClose();
    setQuery('');
    setUsers([]);
  };

  const COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800'];
  function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }}>
            <SearchOutlined style={{ fontSize: 13, color: 'white' }} />
          </div>
          <span className="font-bold text-gray-800">New Message</span>
        </div>
      }
      width={420}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5 mb-4">
        <SearchOutlined style={{ color: '#9ca3af', fontSize: 16 }} />
        <input
          type="text"
          placeholder="Search by username or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          autoFocus
        />
        {loading && <Spin size="small" />}
      </div>

      {/* User list */}
      <div className="max-h-72 overflow-y-auto">
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {query ? (
              <>
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm">No users found for "{query}"</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm">Type to search users</p>
              </>
            )}
          </div>
        )}
        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => handleSelectUser(u)}
            className="flex items-center gap-3 px-2 py-2.5 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all group"
          >
            <Avatar
              src={u.avatar || undefined}
              size={44}
              style={{ background: avatarColor(u.username), fontWeight: 700, flexShrink: 0 }}
            >
              {u.username[0].toUpperCase()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{u.username}</p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
