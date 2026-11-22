import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipoJugador } from '../equipo-jugador/entities/equipo-jugador.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { Partido } from '../partidos/entities/partido.entity';
import { PartidosModule } from '../partidos/partidos.module';
import { AnotacionesController } from './anotaciones.controller';
import { AnotacionesService } from './anotaciones.service';
import { Anotacion } from './entities/anotacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Anotacion, Partido, Jugador, EquipoJugador]),
    // PartidoNotificacionesService: aviso por correo de cada gol.
    PartidosModule,
  ],
  controllers: [AnotacionesController],
  providers: [AnotacionesService],
  exports: [AnotacionesService],
})
export class AnotacionesModule {}
