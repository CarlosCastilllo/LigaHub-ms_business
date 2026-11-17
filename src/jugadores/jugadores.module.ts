import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityUsersClient } from '../common/security/security-users.client';
import { Jugador } from './entities/jugador.entity';
import { JugadoresController } from './jugadores.controller';
import { JugadoresService } from './jugadores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Jugador])],
  controllers: [JugadoresController],
  providers: [JugadoresService, SecurityUsersClient],
  exports: [JugadoresService],
})
export class JugadoresModule {}
