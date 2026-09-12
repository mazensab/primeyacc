import { ChatItemProps, ChatMessageProps, UserPropsTypes } from "./types";
import { create, StateCreator } from "zustand";

interface UseChatStore {
  chats: ChatItemProps[];
  selectedChat: ChatItemProps | null;
  showProfileSheet: boolean;
  showNewChatDialog: boolean;
  setChats: (chats: ChatItemProps[]) => void;
  setSelectedChat: (chat: ChatItemProps | null) => void;
  toggleProfileSheet: (value: boolean) => void;
  toggleNewChatDialog: (value: boolean) => void;
  sendMessage: (content: string) => void;
  sendImages: (images: string[], caption?: string) => void;
  sendAudio: (path: string) => void;
  sendVideo: (path: string) => void;
  sendFile: (name: string, size: string, path: string) => void;
  startChat: (contact: UserPropsTypes) => void;
  startGroup: (name: string, members: UserPropsTypes[]) => void;
}

const buildMessage = (
  messages: ChatMessageProps[],
  partial: Partial<ChatMessageProps>
): ChatMessageProps => ({
  id: (messages[messages.length - 1]?.id ?? 0) + 1,
  own_message: true,
  read: false,
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  ...partial
});

const appendMessage = (
  state: UseChatStore,
  partial: Partial<ChatMessageProps>,
  lastMessage: string
): Partial<UseChatStore> => {
  if (!state.selectedChat) return {};

  const selectedId = state.selectedChat.id;
  const messages = state.selectedChat.messages ?? [];
  const newMessage = buildMessage(messages, partial);

  if (state.selectedChat.type === "group") {
    lastMessage = `You: ${lastMessage}`;
  }

  return {
    selectedChat: {
      ...state.selectedChat,
      last_message: lastMessage,
      messages: [...messages, newMessage]
    },
    chats: state.chats.map((chat) =>
      chat.id === selectedId
        ? {
            ...chat,
            last_message: lastMessage,
            status: "sent",
            date: newMessage.time,
            messages: [...(chat.messages ?? []), newMessage]
          }
        : chat
    )
  };
};

const chatStore: StateCreator<UseChatStore> = (set) => ({
  chats: [],
  selectedChat: null,
  showProfileSheet: false,
  showNewChatDialog: false,
  setChats: (chats) => set({ chats }),
  setSelectedChat: (chat) => set(() => ({ selectedChat: chat })),
  toggleProfileSheet: (value) => set({ showProfileSheet: value }),
  toggleNewChatDialog: (value) => set({ showNewChatDialog: value }),
  startChat: (contact) =>
    set((state) => {
      const existing = state.chats.find(
        (chat) => chat.type !== "group" && chat.user_id === contact.id
      );
      if (existing) return { selectedChat: existing };

      const newChat: ChatItemProps = {
        id: Math.max(0, ...state.chats.map((chat) => chat.id)) + 1,
        type: "personal",
        user_id: contact.id,
        user: contact,
        last_message: "",
        messages: []
      };
      return { chats: [newChat, ...state.chats], selectedChat: newChat };
    }),
  startGroup: (name, members) =>
    set((state) => {
      if (!name || members.length === 0) return state;

      const newChat: ChatItemProps = {
        id: Math.max(0, ...state.chats.map((chat) => chat.id)) + 1,
        type: "group",
        name,
        user_id: members[0].id,
        user: members[0],
        members: members.map((member) => member.id),
        users: members,
        last_message: "",
        messages: []
      };
      return { chats: [newChat, ...state.chats], selectedChat: newChat };
    }),
  sendMessage: (content) => set((state) => appendMessage(state, { content, type: "text" }, content)),
  sendAudio: (path) =>
    set((state) => appendMessage(state, { type: "sound", data: { path } }, "🎤 Voice message")),
  sendVideo: (path) =>
    set((state) => appendMessage(state, { type: "video", data: { path } }, "🎬 Video")),
  sendFile: (name, size, path) =>
    set((state) =>
      appendMessage(state, { type: "file", data: { file_name: name, size, path } }, `📎 ${name}`)
    ),
  sendImages: (images, caption) =>
    set((state) =>
      images.length === 0
        ? state
        : appendMessage(
            state,
            { type: "image", content: caption || undefined, data: { images } },
            caption || "📷 Photo"
          )
    )
});

const useChatStore = create(chatStore);

export default useChatStore;
