import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ContentItemsController } from './content-items.controller';
import { ContentItemsService } from './content-items.service';

@Module({
  imports: [StorageModule],
  controllers: [ContentItemsController],
  providers: [ContentItemsService],
  exports: [ContentItemsService],
})
export class ContentItemsModule {}
