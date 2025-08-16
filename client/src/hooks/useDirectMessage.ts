import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';
import { getUserByUsername } from '../services/userService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    // TODO: Task 3 - Emit a 'joinChat' event to the socket with the chat ID function argument.
    if (socket) {
      socket.emit('joinChat', chatID);
    }
  };

  const handleSendMessage = async () => {
    // TODO: Task 3 - Implement the send message handler function.
    // Whitespace-only messages should not be sent, and the current chat to send this message to
    // should be defined. Use the appropriate service function to make an API call, and update the
    // states accordingly.
    if (!newMessage.trim() || !selectedChat?._id) {
      return;
    }
    try {
      const updatedChat = await sendMessage(
        {
          msg: newMessage,
          msgFrom: user.username!,
          msgDateTime: new Date(),
        },
        selectedChat._id.toString(),
      );
      setSelectedChat(updatedChat);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    // TODO: Task 3 - Implement the chat selection handler function.
    // If the chat ID is defined, fetch the chat details using the appropriate service function,
    // and update the appropriate state variables. Make sure the client emits a socket event to
    // subscribe to the chat room.
    if (!chatID) {
      return;
    }
    try {
      const chat = await getChatById(chatID);
      setSelectedChat(chat);
      handleJoinChat(chatID);
    } catch (error) {
      console.error('Error selecting chat:', error);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate || !user._id) {
      return;
    }
    try {
      const selectedUser = await getUserByUsername(chatToCreate);
      if (!selectedUser._id) {
        return;
      }
      const newChat = await createChat([user._id, selectedUser._id.toString()]);
      setChats(prevChats => [...prevChats, newChat]);
      setSelectedChat(newChat);
      if (newChat._id) {
        handleJoinChat(newChat._id.toString());
      }
      setShowCreatePanel(false);
      setChatToCreate('');
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const userChats = await getChatsByUser(user.username);
        setChats(userChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setChats([]);
      }
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      // TODO: Task 3 - Implement the chat update handler function.
      // This function is responsible for updating the state variables based on the
      // socket events received. The function should handle the following cases:
      // - A new chat is created (add the chat to the current list of chats)
      // - A new message is received (update the selected chat with the new message)
      // - Throw an error for an invalid chatUpdate type
      // NOTE: For new messages, the user will only receive the update if they are
      // currently subscribed to the chat room.
      const { chat, type } = chatUpdate;
      if (type === 'created') {
        setChats(prevChats => {
          const exists = prevChats.some(existingChat => existingChat._id === chat._id);
          return exists ? prevChats : [...prevChats, chat];
        });
      } else if (type === 'newMessage') {
        // A new message is received (update the selected chat with the new message)
        if (selectedChat && selectedChat._id === chat._id) {
          setSelectedChat(chat);
        }
        setChats(prevChats =>
          prevChats.map(existingChat => (existingChat._id === chat._id ? chat : existingChat)),
        );
      } else {
        throw new Error(`Invalid chatUpdate type: ${type}`);
      }
    };

    fetchChats();

    // TODO: Task 3 - Register the 'chatUpdate' event listener
    if (socket) {
      socket.on('chatUpdate', handleChatUpdate);
    }
    return () => {
      if (socket) {
        socket.off('chatUpdate', handleChatUpdate);
        if (selectedChat?._id) {
          socket.emit('leaveChat', selectedChat._id.toString());
        }
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
