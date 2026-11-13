import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AficionadosController } from './aficionados.controller';
import { AficionadosService } from './aficionados.service';
import { Aficionado } from './entities/aficionado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Aficionado])],
  controllers: [AficionadosController],
  providers: [AficionadosService],
  exports: [AficionadosService],
})
export class AficionadosModule {}
