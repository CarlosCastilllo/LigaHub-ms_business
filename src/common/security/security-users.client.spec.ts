import { jest } from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { SecurityUsersClient } from './security-users.client';

describe('SecurityUsersClient', () => {
  const config = { get: () => 'http://security' } as unknown as ConfigService;
  const client = new SecurityUsersClient(config);
  let getSpy: ReturnType<typeof jest.spyOn>;

  const httpError = (status?: number) =>
    new AxiosError(
      'request failed',
      status ? String(status) : 'ECONNREFUSED',
      undefined,
      undefined,
      status
        ? {
            status,
            statusText: '',
            data: {},
            headers: {},
            config: { headers: new AxiosHeaders() },
          }
        : undefined,
    );

  beforeEach(() => {
    getSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  it('asks ms-security for the user with the caller token', async () => {
    getSpy.mockResolvedValue({ data: { id: 7 } } as never);

    await expect(client.assertUserExists(7, 'Bearer t')).resolves.toBeUndefined();
    expect(getSpy).toHaveBeenCalledWith('http://security/api/users/7', {
      headers: { Authorization: 'Bearer t' },
      timeout: 5000,
    });
  });

  it.each([
    [404, NotFoundException],
    [401, UnauthorizedException],
    [403, ForbiddenException],
    [500, ServiceUnavailableException],
    [undefined, ServiceUnavailableException],
  ])('maps a %s response to the right exception', async (status, expected) => {
    getSpy.mockRejectedValue(httpError(status) as never);

    await expect(client.assertUserExists(7, 'Bearer t')).rejects.toBeInstanceOf(
      expected,
    );
  });
});
