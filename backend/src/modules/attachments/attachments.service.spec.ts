import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { createReadStream } from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(),
}));

const fs = require('fs');

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    ticket: {
      findUnique: jest.fn(),
    },
    ticketAttachment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCurrentUser = {
    userId: '1',
    username: 'testuser',
    realName: 'Test User',
    role: 'user',
  };

  const mockTicket = {
    id: BigInt(1),
    title: 'Test Ticket',
    status: 'OPEN',
  };

  const mockFile = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: '/tmp/uploads',
    filename: '1234567890-abc123-test.pdf',
    path: '/home/user/project/uploads/attachments/2024/01/01/1234567890-abc123-test.pdf',
    buffer: Buffer.from(''),
    stream: null,
  } as any;

  const mockAttachment = {
    id: BigInt(1),
    ticketId: BigInt(1),
    fileName: 'test.pdf',
    fileSize: BigInt(1024),
    mimeType: 'application/pdf',
    filePath: 'uploads/attachments/2024/01/01/1234567890-abc123-test.pdf',
    uploaderSnapshot: {
      id: '1',
      username: 'testuser',
      realName: 'Test User',
    },
    uploadedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    beforeEach(() => {
      // Mock process.cwd()
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/project');
    });

    it('should upload an attachment successfully', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketAttachment.create.mockResolvedValue(mockAttachment);

      const result = await service.upload('1', mockFile, mockCurrentUser);

      expect(result).toEqual({
        id: '1',
        ticketId: '1',
        fileName: mockAttachment.fileName,
        fileSize: '1024',
        mimeType: mockAttachment.mimeType,
        uploaderSnapshot: mockAttachment.uploaderSnapshot,
        uploadedAt: mockAttachment.uploadedAt,
      });

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });

      expect(prisma.ticketAttachment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.upload('999', mockFile, mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it('should handle file upload with Chinese filename', async () => {
      const chineseFile = {
        ...mockFile,
        originalname: '测试文件.pdf',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticketAttachment.create.mockResolvedValue({
        ...mockAttachment,
        fileName: '测试文件.pdf',
      });

      const result = await service.upload('1', chineseFile, mockCurrentUser);

      expect(result.fileName).toBe('测试文件.pdf');
    });
  });

  describe('findAll', () => {
    it('should return all attachments for a ticket', async () => {
      const attachments = [mockAttachment, { ...mockAttachment, id: BigInt(2) }];
      mockPrismaService.ticketAttachment.findMany.mockResolvedValue(attachments);

      const result = await service.findAll('1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');

      expect(prisma.ticketAttachment.findMany).toHaveBeenCalledWith({
        where: { ticketId: BigInt(1) },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should return empty array when no attachments exist', async () => {
      mockPrismaService.ticketAttachment.findMany.mockResolvedValue([]);

      const result = await service.findAll('1');

      expect(result).toEqual([]);
    });
  });

  describe('download', () => {
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/project');
    });

    it('should download an attachment successfully', async () => {
      const mockStream = { pipe: jest.fn() } as any;
      fs.createReadStream.mockReturnValue(mockStream);
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(mockAttachment);

      const result = await service.download('1');

      expect(result.fileName).toBe(mockAttachment.fileName);
      expect(result.mimeType).toBe(mockAttachment.mimeType);
      expect(fs.createReadStream).toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(null);

      await expect(service.download('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file does not exist', async () => {
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(mockAttachment);
      fs.existsSync.mockReturnValue(false);

      await expect(service.download('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue('/home/user/project');
    });

    it('should remove an attachment successfully', async () => {
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(mockAttachment);
      mockPrismaService.ticketAttachment.delete.mockResolvedValue(mockAttachment);

      const result = await service.remove('1', mockCurrentUser);

      expect(result).toEqual({ message: '附件已删除' });
      expect(prisma.ticketAttachment.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(null);

      await expect(service.remove('999', mockCurrentUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the uploader', async () => {
      const otherUserAttachment = {
        ...mockAttachment,
        uploaderSnapshot: {
          id: '2',
          username: 'otheruser',
          realName: 'Other User',
        },
      };

      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(otherUserAttachment);

      await expect(service.remove('1', mockCurrentUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to delete any attachment', async () => {
      const otherUserAttachment = {
        ...mockAttachment,
        uploaderSnapshot: {
          id: '2',
          username: 'otheruser',
          realName: 'Other User',
        },
      };

      const adminUser = {
        ...mockCurrentUser,
        role: 'admin',
      };

      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(otherUserAttachment);
      mockPrismaService.ticketAttachment.delete.mockResolvedValue(otherUserAttachment);

      const result = await service.remove('1', adminUser);

      expect(result).toEqual({ message: '附件已删除' });
    });

    it('should handle file deletion failure gracefully', async () => {
      mockPrismaService.ticketAttachment.findUnique.mockResolvedValue(mockAttachment);
      mockPrismaService.ticketAttachment.delete.mockResolvedValue(mockAttachment);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('File deletion failed');
      });

      // Should not throw error even if file deletion fails
      const result = await service.remove('1', mockCurrentUser);

      expect(result).toEqual({ message: '附件已删除' });
      expect(prisma.ticketAttachment.delete).toHaveBeenCalled();
    });
  });
});
