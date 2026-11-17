import { jest } from '@jest/globals';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JugadoresController } from './jugadores.controller';
import { JugadoresService } from './jugadores.service';

describe('Jugador routes', () => {
  let app: INestApplication<App>;
  const jugadorId = '550e8400-e29b-41d4-a716-446655440200';
  const valido = {
    user_id: 7,
    fecha_nacimiento: '1999-05-10',
    nacionalidad: 'Colombiana',
  };
  const jugador = { id: jugadorId, ...valido, activo: true };
  const jugadoresService = {
    create: jest.fn().mockResolvedValue(jugador),
    findAll: jest.fn().mockResolvedValue([jugador]),
    findOne: jest.fn().mockResolvedValue(jugador),
    update: jest.fn().mockResolvedValue(jugador),
    remove: jest.fn().mockResolvedValue({ message: 'Jugador deleted' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JugadoresController],
      providers: [{ provide: JugadoresService, useValue: jugadoresService }],
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

  it('serves the jugador CRUD forwarding the caller token on create', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/jugadores')
      .set('Authorization', 'Bearer token-admin')
      .send(valido)
      .expect(201);
    expect(jugadoresService.create).toHaveBeenCalledWith(
      valido,
      'Bearer token-admin',
    );
    await request(server).get('/jugadores').expect(200);
    await request(server).get(`/jugadores/${jugadorId}`).expect(200);
    await request(server)
      .patch(`/jugadores/${jugadorId}`)
      .send({ activo: false })
      .expect(200);
    await request(server).delete(`/jugadores/${jugadorId}`).expect(200);
  });

  it('rejects invalid jugador data', async () => {
    const server = app.getHttpServer();

    await request(server).post('/jugadores').send({}).expect(400);
    await request(server)
      .post('/jugadores')
      .send({ ...valido, user_id: 'siete' })
      .expect(400);
    await request(server)
      .post('/jugadores')
      .send({ ...valido, user_id: 0 })
      .expect(400);
    await request(server)
      .post('/jugadores')
      .send({ ...valido, fecha_nacimiento: '10/05/1999' })
      .expect(400);
    await request(server)
      .post('/jugadores')
      .send({ ...valido, nacionalidad: 'x'.repeat(101) })
      .expect(400);
    await request(server)
      .post('/jugadores')
      .send({ ...valido, nombres: 'Alex' })
      .expect(400);
    await request(server)
      .patch(`/jugadores/${jugadorId}`)
      .send({ user_id: 8 })
      .expect(400);
    await request(server).get('/jugadores/no-es-uuid').expect(400);
  });

  it('propagates duplicate and dependency conflicts', async () => {
    const server = app.getHttpServer();
    jugadoresService.create.mockRejectedValueOnce(
      new ConflictException('A jugador for user 7 already exists'),
    );
    jugadoresService.remove.mockRejectedValueOnce(
      new ConflictException('Jugador has habilidades'),
    );

    await request(server).post('/jugadores').send(valido).expect(409);
    await request(server).delete(`/jugadores/${jugadorId}`).expect(409);
  });
});
