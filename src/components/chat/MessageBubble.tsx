import { useState } from 'react';
import { Dropdown, Popover } from 'antd';
import { DeleteOutlined, SmileOutlined, RetweetOutlined } from '@ant-design/icons';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import dayjs from 'dayjs';
import { type Message } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';

const AVATAR_COLORS = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#009688','#4CAF50','#FF9800'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface Props {
  message: Message;
  roomId: string;
  onReply: (msg: Message) => void;
}

export default function MessageBubble({ message, roomId, onReply }: Props) {
  const { user } = useAuthStore();
  const isMe = message.sender?._id === user?._id;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socket = getSocket();

  const handleDelete = () => socket.emit('deleteMessage', { messageId: message._id, roomId });

  const handleReaction = (emoji: any) => {
    socket.emit('addReaction', { messageId: message._id, emoji: emoji.native, roomId });
    setShowEmojiPicker(false);
  };

  const menuItems = [
    { key: 'reply', icon: <RetweetOutlined />, label: 'Reply', onClick: () => onReply(message) },
    ...(isMe && !message.isDeleted
      ? [{ key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: handleDelete }]
      : []),
  ];

  const reactionMap: Record<string, number> = {};
  message.reactions?.forEach((r) => { reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1; });

  const senderColor = avatarColor(message.sender?.username || '?');
  const hasReply = !!message.replyTo;

  return (
    <div className={`flex msg-anim my-0.5 ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {/* Others avatar */}
      {!isMe && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm mb-1"
          style={{ background: senderColor, minWidth: 28 }}
        >
          {message.sender?.username?.[0]?.toUpperCase()}
        </div>
      )}

      <div className={`max-w-[72%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isMe && (
          <span className="text-xs font-semibold mb-0.5 ml-1" style={{ color: senderColor }}>
            {message.sender?.username}
          </span>
        )}

        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
          <div className="relative">
            {/* Reply reference */}
            {hasReply && (
              <div
                className={`text-xs px-3 py-1.5 border-l-[3px] rounded-t-xl mb-0 ${
                  isMe
                    ? 'bg-blue-400/80 border-white/60 text-white/90'
                    : 'bg-gray-100 border-gray-400 text-gray-600'
                }`}
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              >
                <p className="font-semibold text-[11px]">{(message.replyTo as any)?.sender?.username}</p>
                <p className="truncate">{(message.replyTo as any)?.content}</p>
              </div>
            )}

            {/* Bubble */}
            <div
              className={`relative px-3 py-2 shadow-md ${
                message.isDeleted
                  ? 'bg-gray-200 text-gray-400 italic rounded-2xl'
                  : isMe
                  ? `text-white rounded-2xl rounded-br-sm ${hasReply ? 'rounded-tr-none' : ''}`
                  : `bg-white text-gray-900 rounded-2xl rounded-bl-sm ${hasReply ? 'rounded-tl-none' : ''}`
              }`}
              style={
                !message.isDeleted && isMe
                  ? { background: 'linear-gradient(135deg, #2AABEE, #229ED9)' }
                  : {}
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-[60px]">
                {message.content}
              </p>

              <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {message.isEdited && !message.isDeleted && (
                  <span className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>edited</span>
                )}
                <span className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  {dayjs(message.createdAt).format('HH:mm')}
                </span>
                {isMe && !message.isDeleted && (
                  <svg className="w-3 h-3 text-blue-100" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7l-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z" />
                  </svg>
                )}
              </div>

              {/* Hover action buttons */}
              {!message.isDeleted && (
                <div
                  className={`absolute -top-3 ${
                    isMe ? 'right-0' : 'left-0'
                  } hidden group-hover:flex items-center gap-1 bg-white rounded-full shadow-lg px-1.5 py-1 border border-gray-100`}
                >
                  <Popover
                    content={
                      <Picker data={data} onEmojiSelect={handleReaction} theme="light" previewPosition="none" />
                    }
                    trigger="click"
                    open={showEmojiPicker}
                    onOpenChange={setShowEmojiPicker}
                  >
                    <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-yellow-500 transition-colors rounded-full hover:bg-gray-100">
                      <SmileOutlined style={{ fontSize: 13 }} />
                    </button>
                  </Popover>
                  <button
                    onClick={() => onReply(message)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors rounded-full hover:bg-gray-100"
                  >
                    <RetweetOutlined style={{ fontSize: 13 }} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Dropdown>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionMap).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction({ native: emoji })}
                className="bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 transition-all shadow-sm"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-gray-600 font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
