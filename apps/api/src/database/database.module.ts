import { Global, Module } from '@nestjs/common';
import { prisma } from '@lms/database';
import { PRISMA_CLIENT } from './database.constants';

@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: prisma }],
  exports: [PRISMA_CLIENT],
})
export class DatabaseModule {}
