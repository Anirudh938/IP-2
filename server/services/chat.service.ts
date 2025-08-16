import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  try {
    const participantIds = [];
    for (const participant of chatPayload.participants) {
      const participantStr = participant.toString();
      const user = await UserModel.findOne({ username: participantStr });
      if (user) {
        participantIds.push(user._id);
      } else {
        participantIds.push(participant);
      }
    }
    const messageIds = [];
    for (const messageData of chatPayload.messages) {
      const message = await MessageModel.create(messageData);
      if (!message) {
        throw new Error('Failed to create message');
      }
      messageIds.push(message._id);
    }
    const chatData = {
      participants: participantIds,
      messages: messageIds,
    };
    const result = await ChatModel.create(chatData);
    if (!result) {
      throw new Error('Failed to create chat');
    }
    const populatedChat = await ChatModel.findById(result._id).populate('messages');
    if (!populatedChat) {
      throw new Error('Failed to populate created chat');
    }
    return populatedChat;
  } catch (error) {
    return { error: `Error occurred when saving chat: ${error}` };
  }
};
/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  try {
    const result = await MessageModel.create(messageData);
    if (!result) {
      throw new Error('Failed to create message');
    }

    return result;
  } catch (error) {
    return { error: `Error occurred when creating message: ${error}` };
  }
};

/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true },
    ).populate('messages');
    if (!updatedChat) {
      throw new Error('Chat not found or failed to update');
    }
    return updatedChat;
  } catch (error) {
    return { error: `Error occurred when adding message to chat: ${error}` };
  }
};

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat = await ChatModel.findById(chatId).populate('messages');
    if (!chat) {
      throw new Error('Chat not found');
    }
    return chat;
  } catch (error) {
    return { error: `Error occurred when retrieving chat: ${error}` };
  }
};

/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  try {
    const users = await UserModel.find({ username: { $in: p } }).select('_id');
    if (users.length !== p.length) {
      return [];
    }
    const participantIds = users.map(user => user._id);
    const chats = await ChatModel.find({
      participants: { $all: participantIds },
    }).populate('messages');
    return chats || [];
  } catch (error) {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param userId - The ID of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true },
    ).populate('messages');

    if (!updatedChat) {
      throw new Error('Chat not found or failed to update');
    }
    return updatedChat;
  } catch (error) {
    return { error: `Error occurred when adding participant to chat: ${error}` };
  }
};
