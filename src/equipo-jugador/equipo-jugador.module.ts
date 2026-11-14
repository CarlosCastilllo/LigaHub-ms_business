import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { EquipoJugador } from './entities/equipo-jugador.entity';
import { EquipoJugadorController } from './equipo-jugador.controller';
import { EquipoJugadorService } from './equipo-jugador.service';

@Module({
  imports: [TypeOrmModule.forFeature([EquipoJugador, Equipo, Jugador])],
  controllers: [EquipoJugadorController],
  providers: [EquipoJugadorService],
  exports: [EquipoJugadorService],
})
export class EquipoJugadorModule {}
