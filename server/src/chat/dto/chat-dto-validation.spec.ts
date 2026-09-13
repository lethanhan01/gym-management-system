import { ConversationStatus } from '@prisma/client'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
  WsDeleteMessageDto,
  WsJoinConversationDto,
  WsLeaveConversationDto,
  WsMarkSeenDto,
  WsSendMessageDto,
  WsTypingDto,
} from './index'

describe('Chat DTO Validation', () => {
  describe('SendMessageDto', () => {
    it('nen hop le khi noi dung tin nhan dung dinh dang', async () => {
      const dto = plainToInstance(SendMessageDto, { content: 'Xin chào huấn luyện viên!' })
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
    })

    it('nen bao loi khi content bi de trong', async () => {
      const dto = plainToInstance(SendMessageDto, { content: '' })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('isNotEmpty')
    })

    it('nen bao loi khi content khong phai chuoi', async () => {
      const dto = plainToInstance(SendMessageDto, { content: 12345 })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('isString')
    })

    it('nen bao loi khi content vuot qua 2000 ky tu', async () => {
      const dto = plainToInstance(SendMessageDto, { content: 'a'.repeat(2001) })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('maxLength')
    })
  })

  describe('QueryMessagesDto', () => {
    it('nen hop le voi payload rong (su dung limit mac dinh)', async () => {
      const dto = plainToInstance(QueryMessagesDto, {})
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
      expect(dto.limit).toBe(50)
    })

    it('nen hop le khi co cursor va limit hop le', async () => {
      const dto = plainToInstance(QueryMessagesDto, { cursor: '150', limit: 25 })
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
      expect(dto.cursor).toBe('150')
      expect(dto.limit).toBe(25)
    })

    it('nen transform chuoi limit sang kieu so', async () => {
      const dto = plainToInstance(QueryMessagesDto, { limit: '30' })
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
      expect(dto.limit).toBe(30)
    })

    it('nen bao loi khi limit nho hon 1', async () => {
      const dto = plainToInstance(QueryMessagesDto, { limit: 0 })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('min')
    })

    it('nen bao loi khi limit lon hon 100', async () => {
      const dto = plainToInstance(QueryMessagesDto, { limit: 101 })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('max')
    })
  })

  describe('QueryConversationsDto', () => {
    it('nen hop le khi status la active', async () => {
      const dto = plainToInstance(QueryConversationsDto, { status: ConversationStatus.active })
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
    })

    it('nen hop le khi status la archived', async () => {
      const dto = plainToInstance(QueryConversationsDto, { status: ConversationStatus.archived })
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
    })

    it('nen hop le khi status khong duoc truyen', async () => {
      const dto = plainToInstance(QueryConversationsDto, {})
      const errors = await validate(dto)
      expect(errors.length).toBe(0)
    })

    it('nen bao loi khi status la gia tri enum khong hop le', async () => {
      const dto = plainToInstance(QueryConversationsDto, { status: 'invalid_status' })
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].constraints).toHaveProperty('isEnum')
    })
  })

  describe('WebSocket DTOs', () => {
    describe('WsSendMessageDto', () => {
      it('nen hop le khi co du conversationId va content hop le', async () => {
        const dto = plainToInstance(WsSendMessageDto, {
          conversationId: '10',
          content: 'Tin nhắn WS',
        })
        const errors = await validate(dto)
        expect(errors.length).toBe(0)
      })

      it('nen bao loi khi thieu conversationId', async () => {
        const dto = plainToInstance(WsSendMessageDto, { content: 'Tin nhắn' })
        const errors = await validate(dto)
        expect(errors.length).toBeGreaterThan(0)
      })

      it('nen bao loi khi content vuot qua 5000 ky tu', async () => {
        const dto = plainToInstance(WsSendMessageDto, {
          conversationId: '10',
          content: 'x'.repeat(5001),
        })
        const errors = await validate(dto)
        expect(errors.length).toBeGreaterThan(0)
        expect(errors[0].constraints).toHaveProperty('maxLength')
      })
    })

    describe('WsJoinConversationDto & WsLeaveConversationDto', () => {
      it('nen hop le khi co conversationId', async () => {
        const joinDto = plainToInstance(WsJoinConversationDto, { conversationId: '1' })
        const leaveDto = plainToInstance(WsLeaveConversationDto, { conversationId: '1' })
        expect((await validate(joinDto)).length).toBe(0)
        expect((await validate(leaveDto)).length).toBe(0)
      })

      it('nen bao loi khi conversationId rong', async () => {
        const joinDto = plainToInstance(WsJoinConversationDto, { conversationId: '' })
        expect((await validate(joinDto)).length).toBeGreaterThan(0)
      })
    })

    describe('WsTypingDto & WsMarkSeenDto', () => {
      it('nen hop le khi co conversationId', async () => {
        const typingDto = plainToInstance(WsTypingDto, { conversationId: '1' })
        const seenDto = plainToInstance(WsMarkSeenDto, { conversationId: '1' })
        expect((await validate(typingDto)).length).toBe(0)
        expect((await validate(seenDto)).length).toBe(0)
      })
    })

    describe('WsDeleteMessageDto', () => {
      it('nen hop le khi co du conversationId va messageId', async () => {
        const dto = plainToInstance(WsDeleteMessageDto, {
          conversationId: '1',
          messageId: '100',
        })
        const errors = await validate(dto)
        expect(errors.length).toBe(0)
      })

      it('nen bao loi khi thieu messageId', async () => {
        const dto = plainToInstance(WsDeleteMessageDto, {
          conversationId: '1',
        })
        const errors = await validate(dto)
        expect(errors.length).toBeGreaterThan(0)
      })
    })
  })
})
