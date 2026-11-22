import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AficionadoEquipo } from '../aficionado-equipo/entities/aficionado-equipo.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { AficionadosController } from './aficionados.controller';
import { AficionadosService } from './aficionados.service';
import { Aficionado } from './entities/aficionado.entity';
import { MiAficionadoController } from './mi-aficionado/mi-aficionado.controller';
import { MiAficionadoService } from './mi-aficionado/mi-aficionado.service';

@Module({
  imports: [TypeOrmModule.forFeature([Aficionado, AficionadoEquipo, Equipo])],
  // MiAficionadoController va primero: /aficionados/me antes que /aficionados/:id.
  controllers: [MiAficionadoController, AficionadosController],
  providers: [AficionadosService, MiAficionadoService],
  exports: [AficionadosService],
})
export class AficionadosModule {}
