import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FasesController } from './fases.controller';
import { FasesService } from './fases.service';
import { FaseFinal } from './entities/fase-final.entity';
import { FaseGrupos } from './entities/fase-grupos.entity';
import { Fase } from './entities/fase.entity';
import { Torneo } from '../torneos/entities/torneo.entity';
import { FaseMapper } from './mappers/fase.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Fase, FaseGrupos, FaseFinal, Torneo])],
  controllers: [FasesController],
  providers: [FasesService, FaseMapper],
  exports: [FasesService],
})
export class FasesModule {}
