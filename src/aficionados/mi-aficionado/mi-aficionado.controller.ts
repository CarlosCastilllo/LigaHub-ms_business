import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUserId } from '../../common/security/current-user-id';
import { AsociarEquipoDto } from './dto/asociar-equipo.dto';
import { ConvertirseAficionadoDto } from './dto/convertirse-aficionado.dto';
import { MiAficionadoService } from './mi-aficionado.service';

// Debe registrarse antes que AficionadosController para que "me" no se
// interprete como el :id de un aficionado.
@Controller('aficionados/me')
export class MiAficionadoController {
  constructor(private readonly miAficionadoService: MiAficionadoService) {}

  @Get()
  findMine(@CurrentUserId() userId: number) {
    return this.miAficionadoService.findMine(userId);
  }

  @Post()
  convertirse(
    @CurrentUserId() userId: number,
    @Body() dto: ConvertirseAficionadoDto,
  ) {
    return this.miAficionadoService.convertirse(userId, dto);
  }

  @Get('equipos-disponibles')
  findEquiposDisponibles() {
    return this.miAficionadoService.findEquiposDisponibles();
  }

  @Post('equipos')
  asociarEquipo(
    @CurrentUserId() userId: number,
    @Body() dto: AsociarEquipoDto,
  ) {
    return this.miAficionadoService.asociarEquipo(userId, dto);
  }

  @Delete('equipos/:equipoId')
  retirarEquipo(
    @CurrentUserId() userId: number,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
  ) {
    return this.miAficionadoService.retirarEquipo(userId, equipoId);
  }
}
