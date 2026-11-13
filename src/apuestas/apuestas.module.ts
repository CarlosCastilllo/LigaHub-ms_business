import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { MetodoPagoAficionado } from '../metodos-pago-aficionado/entities/metodo-pago-aficionado.entity';
import { Partido } from '../partidos/entities/partido.entity';
import { ApuestasController } from './apuestas.controller';
import { ApuestasService } from './apuestas.service';
import { Apuesta } from './entities/apuesta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apuesta,
      Aficionado,
      Partido,
      MetodoPagoAficionado,
    ]),
  ],
  controllers: [ApuestasController],
  providers: [ApuestasService],
  exports: [ApuestasService],
})
export class ApuestasModule {}
