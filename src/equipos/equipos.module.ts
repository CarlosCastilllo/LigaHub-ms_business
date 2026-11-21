import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Equipo } from './entities/equipo.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
import { EquipoDeporte } from '../equipos-deportes/entities/equipo-deporte.entity';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipo, FaseGrupos, EquipoDeporte, Inscripcion]),
  ],
  controllers: [EquiposController],
  providers: [EquiposService],
  exports: [EquiposService],
})
export class EquiposModule {}
