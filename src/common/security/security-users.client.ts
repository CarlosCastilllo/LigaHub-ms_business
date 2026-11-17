import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Consulta usuarios de ms-security; Business no accede a su base de datos.
@Injectable()
export class SecurityUsersClient {
  private readonly logger = new Logger(SecurityUsersClient.name);

  constructor(private readonly configService: ConfigService) {}

  async assertUserExists(userId: number, authorization?: string): Promise<void> {
    const securityBaseUrl = this.configService.get<string>('MS_SECURITY');
    if (!securityBaseUrl) {
      throw new ServiceUnavailableException('Servicio de seguridad no configurado');
    }

    try {
      await axios.get(`${securityBaseUrl}/api/users/${userId}`, {
        headers: authorization ? { Authorization: authorization } : undefined,
        timeout: 5000,
      });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
      if (status === 401) {
        throw new UnauthorizedException('Token invalido o expirado');
      }
      if (status === 403) {
        throw new ForbiddenException('No tiene permiso para consultar usuarios');
      }
      this.logger.error(
        `No fue posible consultar el usuario ${userId}: ${status ?? 'sin respuesta'}`,
      );
      throw new ServiceUnavailableException('Servicio de seguridad no disponible');
    }
  }
}
