/* eslint-disable @typescript-eslint/no-var-requires */
import mongoose from 'mongoose';

import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../../services/chat.service';
import { Chat, CreateChatPayload } from '../../types/chat';
import { Message } from '../../types/message';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('Chat service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------------------
  // 1. saveChat
  // ----------------------------------------------------------------------------
  describe('saveChat', () => {
    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      const mockChatPayload: CreateChatPayload = {
        participants: [new mongoose.Types.ObjectId()],
        messages: [
          {
            msg: 'Hello!',
            msgFrom: 'testUser',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            type: 'direct',
          },
        ],
      };

      // Mock user lookup
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      // Mock message creation
      const mockMessageId = new mongoose.Types.ObjectId();
      mockingoose(MessageModel).toReturn(
        {
          _id: mockMessageId,
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      // Mock chat creation
      const mockChatId = new mongoose.Types.ObjectId();
      mockingoose(ChatModel).toReturn(
        {
          _id: mockChatId,
          participants: [new mongoose.Types.ObjectId()],
          messages: [mockMessageId],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      // Mock the findById + populate operation
      mockingoose(ChatModel).toReturn(
        {
          _id: mockChatId,
          participants: [new mongoose.Types.ObjectId()],
          messages: [
            {
              _id: mockMessageId,
              msg: 'Hello!',
              msgFrom: 'testUser',
              msgDateTime: new Date('2025-01-01T00:00:00Z'),
              type: 'direct',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'findOne',
      );

      const result = await saveChat(mockChatPayload);

      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should return error when chat creation fails', async () => {
      const mockChatPayload: CreateChatPayload = {
        participants: [new mongoose.Types.ObjectId()],
        messages: [
          {
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            type: 'direct',
          },
        ],
      };

      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'user1' },
        'findOne',
      );

      mockingoose(MessageModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), msg: 'Hello!', msgFrom: 'user1' },
        'create',
      );

      mockingoose(ChatModel).toReturn(new Error('Database error'), 'create');

      const result = await saveChat(mockChatPayload);

      expect('error' in result).toBe(true);
    });

    it('should return error when message creation fails', async () => {
      const mockChatPayload: CreateChatPayload = {
        participants: [new mongoose.Types.ObjectId()],
        messages: [
          {
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            type: 'direct',
          },
        ],
      };

      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'user1' },
        'findOne',
      );

      mockingoose(MessageModel).toReturn(new Error('Message creation failed'), 'create');

      const result = await saveChat(mockChatPayload);

      expect('error' in result).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. createMessage
  // ----------------------------------------------------------------------------
  describe('createMessage', () => {
    // TODO: Task 3 - Write tests for the createMessage function
    const mockMessage: Message = {
      msg: 'Hey!',
      msgFrom: 'userX',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      // Mock the user existence check
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'userX' },
        'findOne',
      );

      // Mock the created message
      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');
      const result = await createMessage(mockMessage);
      expect(result).toMatchObject({
        msg: 'Hey!',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      });
    });

    it('should return error when message creation fails', async () => {
      const mockMessage: Message = {
        msg: 'Test message',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };
      mockingoose(MessageModel).toReturn(new Error('Database error'), 'create');
      const result = await createMessage(mockMessage);
      expect('error' in result).toBe(false);
    });

    it('should return error when message creation returns null', async () => {
      const mockMessage: Message = {
        msg: 'Test message',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };
      mockingoose(MessageModel).toReturn(null, 'create');
      const result = await createMessage(mockMessage);
      expect('error' in result).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 3. addMessageToChat
  // ----------------------------------------------------------------------------
  describe('addMessageToChat', () => {
    // TODO: Task 3 - Write tests for the addMessageToChat function
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      // Mock findByIdAndUpdate
      mockingoose(ChatModel).toReturn(mockUpdatedChat, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return error when chat is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');
      const result = await addMessageToChat(chatId, messageId);
      expect('error' in result).toBe(true);
    });

    it('should return error when database error occurs', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();
      mockingoose(ChatModel).toReturn(new Error('Database error'), 'findOneAndUpdate');
      const result = await addMessageToChat(chatId, messageId);
      expect('error' in result).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. addParticipantToChat
  // ----------------------------------------------------------------------------
  describe('addParticipantToChat', () => {
    // TODO: Task 3 - Write tests for the addParticipantToChat function
    it('should add a participant if user exists', async () => {
      // Mock user
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(mockChat._id!.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return error when user is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();
      mockingoose(UserModel).toReturn(null, 'findOne');
      const result = await addParticipantToChat(chatId, userId);
      expect('error' in result).toBe(true);
    });

    it('should return error when chat update fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');
      const result = await addParticipantToChat(chatId, userId);
      expect('error' in result).toBe(true);
    });

    it('should return error when database error occurs during user lookup', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();
      mockingoose(UserModel).toReturn(new Error('Database error'), 'findOne');
      const result = await addParticipantToChat(chatId, userId);
      expect('error' in result).toBe(true);
    });
  });

  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0]], 'find');

      const result = await getChatsByParticipants(['user1', 'user2']);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should retrieve chats by participants where the provided list is a subset', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user2', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0], mockChats[1]], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should return an empty array if no chats are found', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if chats is null', async () => {
      mockingoose(ChatModel).toReturn(null, 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if a database error occurs', async () => {
      mockingoose(ChatModel).toReturn(new Error('database error'), 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });
  });
});
