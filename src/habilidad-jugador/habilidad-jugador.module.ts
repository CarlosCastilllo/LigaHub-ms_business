import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habilidad } from '../habilidades/entities/habilidad.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { HabilidadJugador } from './entities/habilidad-jugador.entity';
import { HabilidadJugadorController } from './habilidad-jugador.controller';
import { HabilidadJugadorService } from './habilidad-jugador.service';

@Module({
  imports: [TypeOrmModule.forFeature([HabilidadJugador, Habilidad, Jugador])],
  controllers: [HabilidadJugadorController],
  providers: [HabilidadJugadorService],
  exports: [HabilidadJugadorService],
})
export class HabilidadJugadorModule {}
