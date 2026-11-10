import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FindFasesQueryDto } from './dto/find-fases-query.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { FasesService } from './fases.service';
import { CreateFaseValidationPipe } from './pipes/create-fase-validation.pipe';
import type { CreateFaseInput } from './pipes/create-fase-validation.pipe';

@Controller('fases')
export class FasesController {
  constructor(private readonly fasesService: FasesService) {}

  @Post()
  create(@Body(CreateFaseValidationPipe) dto: CreateFaseInput) {
    return this.fasesService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindFasesQueryDto) {
    return this.fasesService.findAll(query.tipo);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFaseDto) {
    return this.fasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fasesService.remove(id);
  }
}
