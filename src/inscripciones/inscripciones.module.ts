import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Torneo } from '../torneos/entities/torneo.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesRepository } from './repositories/inscripciones.repository';
import { InscripcionesService } from './inscripciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion, Torneo])],
  controllers: [InscripcionesController],
  providers: [InscripcionesService, InscripcionesRepository],
  exports: [InscripcionesService],
})
export class InscripcionesModule {}
