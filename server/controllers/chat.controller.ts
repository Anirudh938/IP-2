import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
  Chat,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean =>
    req.body !== undefined &&
    req.body.participants !== undefined &&
    Array.isArray(req.body.participants) &&
    req.body.participants.length > 0 &&
    req.body.messages !== undefined &&
    Array.isArray(req.body.messages);

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean =>
    req.body !== undefined &&
    req.body.msg !== undefined &&
    req.body.msg !== '' &&
    req.body.msgFrom !== undefined &&
    req.params.chatId !== undefined &&
    req.params.chatId !== '';

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean =>
    req.body !== undefined &&
    req.body.participantId !== undefined &&
    req.params.chatId !== undefined &&
    req.params.chatId !== '';

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    try {
      if (!isCreateChatRequestValid(req)) {
        res.status(400).send('Invalid chat request body');
        return;
      }
      const result = await saveChat(req.body);
      if ('error' in result) {
        throw new Error(result.error);
      }
      const populatedResult = await populateDocument(result._id?.toString(), 'chat');
      if ('error' in populatedResult) {
        throw new Error(populatedResult.error);
      }
      socket.emit('chatUpdate', {
        chat: populatedResult as Chat,
        type: 'created',
      });
      res.status(200).json(populatedResult);
    } catch (error) {
      res.status(500).send(`Error when creating chat: ${error}`);
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    try {
      if (!isAddMessageRequestValid(req)) {
        res.status(400).send('Invalid message request body');
        return;
      }
      const { chatId } = req.params;
      const { msg, msgFrom, msgDateTime } = req.body;
      const messageData = {
        msg,
        msgFrom: msgFrom.toString(),
        msgDateTime: msgDateTime || new Date(),
        type: 'direct' as const,
      };

      const messageResult = await createMessage(messageData);
      if ('error' in messageResult) {
        throw new Error(messageResult.error);
      }
      const createdMessage = messageResult;
      if (!createdMessage._id) {
        throw new Error('Created message missing ID');
      }
      const chatResult = await addMessageToChat(chatId, createdMessage._id.toString());
      if ('error' in chatResult) {
        throw new Error(chatResult.error);
      }

      const populatedResult = await populateDocument(chatResult._id?.toString(), 'chat');
      if ('error' in populatedResult) {
        throw new Error(populatedResult.error);
      }
      socket.to(chatId).emit('chatUpdate', {
        chat: chatResult,
        type: 'newMessage',
      });

      res.status(200).json(chatResult);
    } catch (error) {
      res.status(500).send(`Error when adding message to chat: ${error}`);
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    try {
      const { chatId } = req.params;
      if (!chatId) {
        res.status(400).send('Chat ID is required');
        return;
      }
      const chatResult = await getChat(chatId);
      if ('error' in chatResult) {
        throw new Error(chatResult.error);
      }
      const populatedResult = await populateDocument(chatResult._id?.toString(), 'chat');
      if ('error' in populatedResult) {
        throw new Error(populatedResult.error);
      }
      res.status(200).json(populatedResult);
    } catch (error) {
      res.status(500).send(`Error when retrieving chat: ${error}`);
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { username } = req.params;
      if (!username) {
        res.status(400).send('Username is required');
        return;
      }
      const chats = await getChatsByParticipants([username]);
      const populatedChats = [];
      for (const chat of chats) {
        try {
          const populatedChat = await populateDocument(chat._id?.toString(), 'chat');
          if ('error' in populatedChat) {
            throw new Error('Failed populating chats');
          }
          populatedChats.push(populatedChat);
        } catch (populationError) {
          throw new Error('Failed populating chats');
        }
      }
      res.status(200).json(populatedChats);
    } catch (error) {
      res.status(500).send(`Error retrieving chat: ${error}`);
    }
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    try {
      if (!isAddParticipantRequestValid(req)) {
        res.status(400).send('Invalid participant request body');
        return;
      }
      const { chatId } = req.params;
      const { participantId } = req.body;
      const result = await addParticipantToChat(chatId, participantId.toString());
      if ('error' in result) {
        throw new Error(result.error);
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error when adding participant to chat: ${error}`);
    }
  };

  socket.on('connection', conn => {
    conn.on('joinChat', (chatId: string) => {
      if (chatId) {
        conn.join(chatId);
      }
    });
    conn.on('leaveChat', (chatId: string | undefined) => {
      if (chatId) {
        conn.leave(chatId);
      }
    });
  });

  // Register the routes
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);
  return router;
};

export default chatController;
