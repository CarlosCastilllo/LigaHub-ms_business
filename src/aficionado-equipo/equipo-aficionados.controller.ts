import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AficionadoEquipoService } from './aficionado-equipo.service';

// HU-GE-05: el administrador deportivo consulta los aficionados de un equipo.
@Controller('equipos')
export class EquipoAficionadosController {
  constructor(
    private readonly aficionadoEquipoService: AficionadoEquipoService,
  ) {}

  @Get(':id/aficionados')
  findAficionados(@Param('id', ParseUUIDPipe) id: string) {
    return this.aficionadoEquipoService.findAficionadosByEquipo(id);
  }
}
