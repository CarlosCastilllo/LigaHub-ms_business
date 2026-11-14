import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pelota } from '../pelotas/entities/pelota.entity';
import { Jugador } from '../jugadores/entities/jugador.entity';
import { PosicionEspacial } from './entities/posicion-espacial.entity';
import { PosicionesEspacialesController } from './posiciones-espaciales.controller';
import { PosicionesEspacialesService } from './posiciones-espaciales.service';

@Module({
  imports: [TypeOrmModule.forFeature([PosicionEspacial, Jugador, Pelota])],
  controllers: [PosicionesEspacialesController],
  providers: [PosicionesEspacialesService],
  exports: [PosicionesEspacialesService],
})
export class PosicionesEspacialesModule {}
