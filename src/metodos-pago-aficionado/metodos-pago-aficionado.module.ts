import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AficionadosModule } from '../aficionados/aficionados.module';
import { Aficionado } from '../aficionados/entities/aficionado.entity';
import { MetodoPago } from '../metodos-pago/entities/metodo-pago.entity';
import { MetodoPagoAficionado } from './entities/metodo-pago-aficionado.entity';
import { MetodosPagoAficionadoController } from './metodos-pago-aficionado.controller';
import { MetodosPagoAficionadoService } from './metodos-pago-aficionado.service';
import { MisMetodosPagoController } from './mis-metodos-pago.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetodoPagoAficionado, Aficionado, MetodoPago]),
    AficionadosModule,
  ],
  controllers: [MetodosPagoAficionadoController, MisMetodosPagoController],
  providers: [MetodosPagoAficionadoService],
  exports: [MetodosPagoAficionadoService],
})
export class MetodosPagoAficionadoModule {}
