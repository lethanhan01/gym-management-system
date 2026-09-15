import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { join } from 'path'
import * as fs from 'fs'
import { PrismaService } from '../prisma/prisma.service'

@Controller('files')
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getFile(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const file = await this.prisma.file.findFirst({
      where: { fileId: BigInt(id), deletedAt: null },
    })

    if (!file) {
      throw new NotFoundException({
        success: false,
        code: 'FILE_NOT_FOUND',
        message: 'Tệp tin không tồn tại hoặc đã bị xóa',
      })
    }

    const absolutePath = join(process.cwd(), file.storagePath)
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException({
        success: false,
        code: 'FILE_NOT_FOUND_ON_DISK',
        message: 'Tệp tin không tồn tại trên hệ thống lưu trữ',
      })
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const fileStream = fs.createReadStream(absolutePath)
    fileStream.pipe(res)
  }
}
