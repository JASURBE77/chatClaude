import { create } from 'zustand';

export interface Message {
  _id: string;
  sender: { _id: string; username: string; avatar: string };
  room: string;
  content: string;
  type: 'text' | 'emoji' | 'image' | 'system';
  reactions: { userId: string; emoji: string }[];
  isEdited: boolean;
  isDeleted: boolean;
  replyTo?: Message | null;
  createdAt: string;
}

export interface Room {
  _id: string;
  name: string;
  type: 'direct' | 'group';
  members: { _id: string; username: string; avatar: string; isOnline: boolean }[];
  lastMessage?: Message | null;
  updatedAt: string;
}

interface TypingUser {
  userId: string;
  username: string;
  roomId: string;
}

interface ChatState {
  rooms: Room[];
  activeRoom: Room | null;
  messages: Record<string, Message[]>;
  typingUsers: TypingUser[];
  onlineUsers: Set<string>;
  setRooms: (rooms: Room[]) => void;
  setActiveRoom: (room: Room | null) => void;
  addMessage: (message: Message) => void;
  setRoomMessages: (roomId: string, messages: Message[]) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string, roomId: string) => void;
  setTyping: (data: TypingUser & { isTyping: boolean }) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  upsertRoom: (room: Room) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoom: null,
  messages: {},
  typingUsers: [],
  onlineUsers: new Set(),

  setRooms: (rooms) => set({ rooms }),

  setActiveRoom: (room) => set({ activeRoom: room }),

  addMessage: (message) =>
    set((state) => {
      const roomId = message.room;
      const existing = state.messages[roomId] || [];
      const updated = [...existing, message];
      const rooms = state.rooms.map((r) =>
        r._id === roomId ? { ...r, lastMessage: message } : r,
      );
      return { messages: { ...state.messages, [roomId]: updated }, rooms };
    }),

  setRoomMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  updateMessage: (message) =>
    set((state) => {
      const roomId = message.room;
      const msgs = (state.messages[roomId] || []).map((m) =>
        m._id === message._id ? message : m,
      );
      return { messages: { ...state.messages, [roomId]: msgs } };
    }),

  deleteMessage: (messageId, roomId) =>
    set((state) => {
      const msgs = (state.messages[roomId] || []).map((m) =>
        m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m,
      );
      return { messages: { ...state.messages, [roomId]: msgs } };
    }),

  setTyping: ({ userId, username, roomId, isTyping }) =>
    set((state) => {
      let typingUsers = state.typingUsers.filter(
        (t) => !(t.userId === userId && t.roomId === roomId),
      );
      if (isTyping) typingUsers = [...typingUsers, { userId, username, roomId }];
      return { typingUsers };
    }),

  setUserOnline: (userId, online) =>
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      if (online) onlineUsers.add(userId);
      else onlineUsers.delete(userId);
      return { onlineUsers };
    }),

  upsertRoom: (room) =>
    set((state) => {
      const exists = state.rooms.find((r) => r._id === room._id);
      const rooms = exists
        ? state.rooms.map((r) => (r._id === room._id ? room : r))
        : [room, ...state.rooms];
      return { rooms };
    }),
}));
