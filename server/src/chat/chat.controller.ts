import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import * as fs from 'fs'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { DatabaseRetryable } from '../common/decorators/database-retryable.decorator'
import { ChatService, ChatUploadedFile } from './chat.service'
import {
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from './dto'

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@DatabaseRetryable()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Lấy danh sách tất cả các cuộc trò chuyện của người dùng hiện tại (Member hoặc Trainer).
   */
  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách các cuộc trò chuyện của user' })
  async getConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryConversationsDto
  ) {
    const data = await this.chatService.getConversationsForUser(user.userId, query.status)
    return { success: true, data }
  }

  /**
   * Lấy thông tin cuộc trò chuyện với PT chính hiện tại của Hội viên.
   */
  @Get('conversations/active')
  @ApiOperation({ summary: 'Lấy cuộc trò chuyện với PT chính hiện tại của Member' })
  async getActiveConversation(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.chatService.getActiveConversationForMember(user.userId)
    return { success: true, data }
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện theo phân trang Cursor-based.
   */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn cuộc trò chuyện (cursor-based)' })
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryMessagesDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.chatService.getMessages(BigInt(id), user.userId, query)
    return { success: true, data }
  }

  /**
   * Gửi tin nhắn văn bản mới qua REST API.
   */
  @Post('conversations/:id/messages')
  @HttpCode(201)
  @ApiOperation({ summary: 'Gửi tin nhắn văn bản mới' })
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.chatService.createMessage(
      BigInt(id),
      user.userId,
      dto.content,
      'text'
    )
    return { success: true, data }
  }

  /**
   * Tải lên hình ảnh đính kèm và tạo tin nhắn dạng ảnh.
   */
  @Post('conversations/:id/upload')
  @HttpCode(201)
  @ApiOperation({ summary: 'Tải lên hình ảnh đính kèm (JPEG, PNG, WebP, GIF, tối đa 5MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'chat')
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          cb(null, dir)
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          const ext = extname(file.originalname).toLowerCase()
          cb(null, `chat-${uniqueSuffix}${ext}`)
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i)) {
          return cb(
            new BadRequestException({
              success: false,
              code: 'INVALID_FILE_TYPE',
              message: 'Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, WebP, GIF',
            }),
            false
          )
        }
        cb(null, true)
      },
    })
  )
  async uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: ChatUploadedFile,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        code: 'FILE_REQUIRED',
        message: 'Vui lòng chọn file hình ảnh đính kèm',
      })
    }
    const data = await this.chatService.uploadAttachmentAndCreateMessage(
      BigInt(id),
      user.userId,
      file
    )
    return { success: true, data }
  }

  /**
   * Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện.
   */
  @Post('conversations/:id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đánh dấu đã đọc cuộc trò chuyện' })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.chatService.markAsRead(BigInt(id), user.userId)
    return { success: true, data }
  }

  /**
   * Thu hồi tin nhắn (Hard Delete - chỉ người gửi mới có quyền).
   */
  @Delete('messages/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Thu hồi tin nhắn' })
  async deleteMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const data = await this.chatService.deleteMessage(BigInt(id), user.userId)
    return { success: true, data }
  }
}
