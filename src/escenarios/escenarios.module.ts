import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escenario } from './entities/escenario.entity';
import { EscenariosController } from './escenarios.controller';
import { EscenariosService } from './escenarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Escenario])],
  controllers: [EscenariosController],
  providers: [EscenariosService],
  exports: [EscenariosService],
})
export class EscenariosModule {}
