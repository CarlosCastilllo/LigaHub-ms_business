import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { MetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { MetodoPagoAficionado } from './entities/metodo-pago-aficionado.entity';
import { MetodosPagoAficionadoController } from './metodos-pago-aficionado.controller';
import { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetodoPagoAficionado, Aficionado, MetodoPago]),
  ],
  controllers: [MetodosPagoAficionadoController],
  providers: [MetodosPagoAficionadoService],
  exports: [MetodosPagoAficionadoService],
})
export class MetodosPagoAficionadoModule {}
