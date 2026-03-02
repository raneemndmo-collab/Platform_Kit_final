import { CqrsModule } from '@nestjs/cqrs';
// M25: File Storage - NestJS Module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileMetadata, FileVersion, FileAccessLog, ScanResult } from './domain/entities';
import { FileStorageService } from './application/services/file-storage.service';
import { FileStorageController } from './api/controllers/file-storage.controller';
import { DeleteFileHandler } from './application/commands/delete-file.handler';
import { UploadFileHandler } from './application/commands/upload-file.handler';
import { ListFilesHandler } from './application/queries/list-files.handler';
import { GetFileHandler } from './application/queries/get-file.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([FileMetadata, FileVersion, FileAccessLog, ScanResult], 'm25_connection')],
  controllers: [FileStorageController],
  providers: [FileStorageService, DeleteFileHandler, UploadFileHandler, ListFilesHandler, GetFileHandler],
  exports: [FileStorageService],
})
export class FileStorageModule {}
