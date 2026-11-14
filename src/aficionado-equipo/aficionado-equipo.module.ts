import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { AficionadoEquipo } from './entities/aficionado-equipo.entity';
import { AficionadoEquipoController } from './aficionado-equipo.controller';
import { AficionadoEquipoService } from './aficionado-equipo.service';

@Module({
  imports: [TypeOrmModule.forFeature([AficionadoEquipo, Aficionado, Equipo])],
  controllers: [AficionadoEquipoController],
  providers: [AficionadoEquipoService],
  exports: [AficionadoEquipoService],
})
export class AficionadoEquipoModule {}
