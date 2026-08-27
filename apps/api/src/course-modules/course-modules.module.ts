import { Module as NestModule } from '@nestjs/common';
import { CourseModulesController } from './course-modules.controller';
import { CourseModulesService } from './course-modules.service';

@NestModule({
  controllers: [CourseModulesController],
  providers: [CourseModulesService],
  exports: [CourseModulesService],
})
export class CourseModulesModule {}
