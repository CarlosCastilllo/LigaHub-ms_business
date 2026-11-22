import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { NotificationsClient } from '../common/notifications/notifications.client';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { EscenarioTorneo } from '../escenarios-torneo/entities/escenario-torneo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Fase } from '../fases/entities/fase.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
import { Partido } from './entities/partido.entity';
import { PartidoNotificacionesService } from './partido-notificaciones.service';
import { PartidosController } from './partidos.controller';
import { PartidosService } from './partidos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Partido,
      Escenario,
      Equipo,
      Fase,
      Inscripcion,
      EscenarioTorneo,
      Aficionado,
    ]),
  ],
  controllers: [PartidosController],
  providers: [
    PartidosService,
    PartidoNotificacionesService,
    SecurityUsersClient,
    NotificationsClient,
  ],
  // AnotacionesModule usa PartidoNotificacionesService para el aviso de gol.
  exports: [PartidosService, PartidoNotificacionesService],
})
export class PartidosModule {}
