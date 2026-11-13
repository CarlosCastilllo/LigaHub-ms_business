import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escenario } from '../escenarios/entities/escenario.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { EscenarioTorneo } from './entities/escenario-torneo.entity';
import { EscenariosTorneoController } from './escenarios-torneo.controller';
import { EscenariosTorneoRepository } from './repositories/escenarios-torneo.repository';
import { EscenariosTorneoService } from './escenarios-torneo.service';

@Module({
  imports: [TypeOrmModule.forFeature([EscenarioTorneo, Torneo, Escenario])],
  controllers: [EscenariosTorneoController],
  providers: [EscenariosTorneoService, EscenariosTorneoRepository],
  exports: [EscenariosTorneoService],
})
export class EscenariosTorneoModule {}
