import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deporte } from './entities/deporte.entity';
import { DeportesController } from './deportes.controller';
import { DeportesService } from './deportes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deporte])],
  controllers: [DeportesController],
  providers: [DeportesService],
  exports: [DeportesService],
})
export class DeportesModule {}
