import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partido } from '../partidos/entities/partido.entity';
import { AnotacionesController } from './anotaciones.controller';
import { AnotacionesService } from './anotaciones.service';
import { Anotacion } from './entities/anotacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Anotacion, Partido])],
  controllers: [AnotacionesController],
  providers: [AnotacionesService],
  exports: [AnotacionesService],
})
export class AnotacionesModule {}
