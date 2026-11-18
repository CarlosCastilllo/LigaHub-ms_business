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
import { HabilidadJugadorController } from './habilidad-jugador.controller';
import { HabilidadJugadorService } from './habilidad-jugador.service';

describe('Player skill routes', () => {
  let app: INestApplication<App>;
  const habilidadId = '550e8400-e29b-41d4-a716-446655440302';
  const jugadorId = '550e8400-e29b-41d4-a716-446655440303';
  const relacionId = '550e8400-e29b-41d4-a716-446655440301';
  const body = { habilidad_id: habilidadId, jugador_id: jugadorId };
  const relacion = { id: relacionId, ...body };
  const service = {
    create: jest.fn().mockResolvedValue(relacion),
    findAll: jest.fn().mockResolvedValue([relacion]),
    remove: jest.fn().mockResolvedValue({ message: 'deleted' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HabilidadJugadorController],
      providers: [{ provide: HabilidadJugadorService, useValue: service }],
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

  it('assigns a habilidad to a jugador', async () => {
    await request(app.getHttpServer())
      .post('/habilidad-jugador')
      .send(body)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it('rejects invalid assignment payloads', async () => {
    const server = app.getHttpServer();

    await request(server).post('/habilidad-jugador').send({}).expect(400);
    await request(server)
      .post('/habilidad-jugador')
      .send({ ...body, jugador_id: 'abc' })
      .expect(400);
    await request(server)
      .post('/habilidad-jugador')
      .send({ ...body, extra: true })
      .expect(400);
  });

  it('filters by jugador and by habilidad', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get(`/habilidad-jugador?jugador_id=${jugadorId}`)
      .expect(200);
    expect(service.findAll).toHaveBeenLastCalledWith({ jugador_id: jugadorId });
    await request(server)
      .get(`/habilidad-jugador?habilidad_id=${habilidadId}`)
      .expect(200);
    expect(service.findAll).toHaveBeenLastCalledWith({
      habilidad_id: habilidadId,
    });
  });

  it('rejects invalid or unknown filters', async () => {
    const server = app.getHttpServer();

    await request(server).get('/habilidad-jugador?jugador_id=abc').expect(400);
    await request(server).get('/habilidad-jugador?habilidad_id=abc').expect(400);
    await request(server).get('/habilidad-jugador?equipo_id=abc').expect(400);
  });

  it('retires a habilidad through its association id', async () => {
    const server = app.getHttpServer();

    await request(server).delete(`/habilidad-jugador/${relacionId}`).expect(200);
    expect(service.remove).toHaveBeenCalledWith(relacionId);
    await request(server).delete('/habilidad-jugador/no-es-uuid').expect(400);
  });

  it('propagates 404 and 409 from the service', async () => {
    const server = app.getHttpServer();
    service.create.mockRejectedValueOnce(new NotFoundException('missing'));
    service.create.mockRejectedValueOnce(new ConflictException('duplicate'));

    await request(server).post('/habilidad-jugador').send(body).expect(404);
    await request(server).post('/habilidad-jugador').send(body).expect(409);
  });
});
