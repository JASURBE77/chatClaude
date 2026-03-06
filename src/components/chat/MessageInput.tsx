import { useState, useRef, useCallback } from 'react';
import { Popover } from 'antd';
import { SendOutlined, SmileOutlined, CloseOutlined } from '@ant-design/icons';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { getSocket } from '../../lib/socket';
import { type Message } from '../../store/chatStore';

interface Props {
  roomId: string;
  replyTo: Message | null;
  onClearReply: () => void;
}

export default function MessageInput({ roomId, replyTo, onClearReply }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socket = getSocket();

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content) return;

    socket.emit('sendMessage', {
      roomId,
      content,
      type: 'text',
      replyTo: replyTo?._id,
    });

    setText('');
    onClearReply();
    socket.emit('typing', { roomId, isTyping: false });
  }, [text, roomId, replyTo, socket, onClearReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    socket.emit('typing', { roomId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 2000);
  };

  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  return (
    <div className="bg-white border-t border-gray-100 shadow-lg">
      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100"
          style={{ background: 'linear-gradient(to right, #f0f8ff, #fff)' }}>
          <div className="w-0.5 h-8 rounded-full" style={{ background: '#2AABEE' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: '#2AABEE' }}>{replyTo.sender?.username}</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onClearReply}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <CloseOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        {/* Emoji button */}
        <Popover
          content={
            <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" previewPosition="none" />
          }
          trigger="click"
          open={showEmoji}
          onOpenChange={setShowEmoji}
          placement="topLeft"
        >
          <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all hover:bg-gray-100"
            style={{ color: showEmoji ? '#2AABEE' : '#9ca3af' }}>
            <SmileOutlined style={{ fontSize: 22 }} />
          </button>
        </Popover>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            className="msg-input w-full resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-300 max-h-32 leading-5 transition-all"
            style={{ minHeight: 42, background: '#f8f9fa' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
            text.trim()
              ? 'text-white shadow-md hover:shadow-lg hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          style={text.trim() ? { background: 'linear-gradient(135deg, #2AABEE, #229ED9)' } : {}}
        >
          <SendOutlined style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}
