import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { InscripcionesController } from './inscripciones.controller';
import { InscripcionesService } from './inscripciones.service';

describe('InscripcionesController', () => {
  let app: INestApplication<App>;
  const torneoId = '550e8400-e29b-41d4-a716-446655440000';
  const inscripcionId = '550e8400-e29b-41d4-a716-446655440001';
  const inscripcion = {
    id: inscripcionId,
    fecha_inscripcion: '2026-03-01',
    estado: 'PENDIENTE',
    equipo_id: '550e8400-e29b-41d4-a716-446655440010',
    torneo_id: torneoId,
  };
  const createPayload = {
    fecha_inscripcion: inscripcion.fecha_inscripcion,
    estado: inscripcion.estado,
    equipo_id: inscripcion.equipo_id,
    torneo_id: inscripcion.torneo_id,
  };
  const service = {
    create: jest.fn().mockResolvedValue(inscripcion),
    findAll: jest.fn().mockResolvedValue([inscripcion]),
    findOne: jest.fn().mockResolvedValue(inscripcion),
    update: jest.fn().mockResolvedValue(inscripcion),
    remove: jest.fn().mockResolvedValue({ message: 'Inscripcion deleted' }),
    getCountByTorneo: jest
      .fn()
      .mockResolvedValue({ torneo_id: torneoId, total_inscripciones: 1 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InscripcionesController],
      providers: [{ provide: InscripcionesService, useValue: service }],
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

  it('exposes inscription CRUD and the tournament count report', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/inscripciones')
      .send(createPayload)
      .expect(201)
      .expect(({ body }) => expect(body.torneo_id).toBe(torneoId));
    await request(server)
      .post('/inscripciones')
      .send({ ...createPayload, equipo_id: 'bad-uuid' })
      .expect(400);
    await request(server).get('/inscripciones').expect(200);
    await request(server).get(`/inscripciones/${inscripcionId}`).expect(200);
    await request(server)
      .patch(`/inscripciones/${inscripcionId}`)
      .send({ estado: 'ACEPTADA' })
      .expect(200);
    await request(server)
      .delete(`/inscripciones/${inscripcionId}`)
      .expect(200);
    await request(server)
      .get(`/inscripciones/reports/torneo/${torneoId}/count`)
      .expect(200)
      .expect(({ body }) => expect(body.total_inscripciones).toBe(1));
  });
});
