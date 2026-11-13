import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { Localidad } from '../localidades/entities/localidad.entity';
import { Partido } from '../partidos/entities/partido.entity';
import { BoletasController } from './boletas.controller';
import { BoletasService } from './boletas.service';
import { Boleta } from './entities/boleta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Boleta, Aficionado, Partido, Localidad]),
  ],
  controllers: [BoletasController],
  providers: [BoletasService],
  exports: [BoletasService],
})
export class BoletasModule {}
