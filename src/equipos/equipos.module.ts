import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fase } from '../fases/entities/fase.entity';
import { Equipo } from './entities/equipo.entity';
import { EquipoDeporte } from '../equipos-deportes/entities/equipo-deporte.entity';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo, Fase, EquipoDeporte])],
  controllers: [EquiposController],
  providers: [EquiposService],
  exports: [EquiposService],
})
export class EquiposModule {}
