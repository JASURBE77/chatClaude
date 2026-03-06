import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useChatStore, type Message, type Room } from '../store/chatStore';

export function useSocket() {
  const {
    addMessage,
    setTyping,
    setUserOnline,
    updateMessage,
    deleteMessage,
    upsertRoom,
    setRoomMessages,
    setActiveRoom,
  } = useChatStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('newMessage', (msg: Message) => {
      addMessage(msg);
    });

    socket.on('userTyping', (data: { userId: string; username: string; isTyping: boolean; roomId: string }) => {
      setTyping(data);
    });

    socket.on('userOnline', ({ userId }: { userId: string }) => {
      setUserOnline(userId, true);
    });

    socket.on('userOffline', ({ userId }: { userId: string }) => {
      setUserOnline(userId, false);
    });

    socket.on('messageReaction', (msg: Message) => {
      updateMessage(msg);
    });

    socket.on('messageEdited', (msg: Message) => {
      updateMessage(msg);
    });

    socket.on('messageDeleted', ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      deleteMessage(messageId, roomId);
    });

    socket.on('directRoomReady', ({ room, messages }: { room: Room; messages: Message[] }) => {
      upsertRoom(room);
      setRoomMessages(room._id, messages);
      setActiveRoom(room);
    });

    return () => {
      socket.off('newMessage');
      socket.off('userTyping');
      socket.off('userOnline');
      socket.off('userOffline');
      socket.off('messageReaction');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('directRoomReady');
    };
  }, []);
}
