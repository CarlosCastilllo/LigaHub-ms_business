import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Partido } from './entities/partido.entity';
import { PartidosController } from './partidos.controller';
import { PartidosService } from './partidos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Partido, Escenario, Equipo])],
  controllers: [PartidosController],
  providers: [PartidosService],
  exports: [PartidosService],
})
export class PartidosModule {}
