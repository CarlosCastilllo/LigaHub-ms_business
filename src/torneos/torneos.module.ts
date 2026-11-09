import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaseFinal } from '../fases/entities/fase-final.entity';
import { FaseGrupos } from '../fases/entities/fase-grupos.entity';
import { Fase } from '../fases/entities/fase.entity';
import { FaseMapper } from '../fases/mappers/fase.mapper';
import { Torneo } from './entities/torneo.entity';
import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';
import { TorneoMapper } from './mappers/torneo.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Torneo, Fase, FaseGrupos, FaseFinal])],
  controllers: [TorneosController],
  providers: [TorneosService, TorneoMapper, FaseMapper],
  exports: [TorneosService],
})
export class TorneosModule {}
