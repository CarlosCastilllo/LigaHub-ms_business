import { jest } from '@jest/globals';
import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EquiposDeportesController } from '../equipos-deportes/equipos-deportes.controller';
import { EquiposDeportesService } from '../equipos-deportes/equipos-deportes.service';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

describe('Team routes', () => {
  let app: INestApplication<App>;
  const equipoId = '550e8400-e29b-41d4-a716-446655440220';
  const equipo = {
    id: equipoId,
    nombre: 'Tigres',
    fase_grupos_id: null,
    activo: true,
  };
  const equiposService = {
    create: jest.fn().mockResolvedValue(equipo),
    findAll: jest.fn().mockResolvedValue([equipo]),
    findOne: jest.fn().mockResolvedValue(equipo),
    update: jest.fn().mockResolvedValue(equipo),
    remove: jest.fn().mockResolvedValue({ message: 'Equipo deleted' }),
  };
  const equiposDeportesService = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EquiposController, EquiposDeportesController],
      providers: [
        { provide: EquiposService, useValue: equiposService },
        { provide: EquiposDeportesService, useValue: equiposDeportesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the team CRUD with validated payloads', async () => {
    const server = app.getHttpServer();

    await request(server).post('/equipos').send({ nombre: 'Tigres' }).expect(201);
    await request(server).get('/equipos').expect(200);
    await request(server).get(`/equipos/${equipoId}`).expect(200);
    await request(server)
      .patch(`/equipos/${equipoId}`)
      .send({ activo: false })
      .expect(200);
    expect(equiposService.update).toHaveBeenCalledWith(equipoId, {
      activo: false,
    });
    await request(server).delete(`/equipos/${equipoId}`).expect(200);
  });

  it('rejects invalid team data', async () => {
    const server = app.getHttpServer();

    await request(server).post('/equipos').send({}).expect(400);
    await request(server).post('/equipos').send({ nombre: '' }).expect(400);
    await request(server)
      .post('/equipos')
      .send({ nombre: 'x'.repeat(151) })
      .expect(400);
    await request(server)
      .post('/equipos')
      .send({ nombre: 'Tigres', activo: 'si' })
      .expect(400);
    await request(server)
      .post('/equipos')
      .send({ nombre: 'Tigres', ciudad: 'Bogota' })
      .expect(400);
    await request(server).get('/equipos/no-es-uuid').expect(400);
  });

  it('propagates not found and dependency conflicts', async () => {
    const server = app.getHttpServer();
    equiposService.findOne.mockRejectedValueOnce(
      new NotFoundException('Equipo not found'),
    );
    equiposService.remove.mockRejectedValueOnce(
      new ConflictException('Equipo has inscripciones'),
    );

    await request(server).get(`/equipos/${equipoId}`).expect(404);
    await request(server).delete(`/equipos/${equipoId}`).expect(409);
  });

  it('filters sport associations by team', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get(`/equipos-deportes?equipo_id=${equipoId}`)
      .expect(200);
    expect(equiposDeportesService.findAll).toHaveBeenCalledWith({
      equipo_id: equipoId,
    });
    await request(server).get('/equipos-deportes?equipo_id=abc').expect(400);
    await request(server)
      .get(`/equipos-deportes?deporte_id=${equipoId}`)
      .expect(200);
    expect(equiposDeportesService.findAll).toHaveBeenLastCalledWith({
      deporte_id: equipoId,
    });
    await request(server).get('/equipos-deportes?deporte_id=abc').expect(400);
  });
});
