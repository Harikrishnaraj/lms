import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CatalogController } from './catalog.controller';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [UsersModule],
  controllers: [CoursesController, CatalogController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
