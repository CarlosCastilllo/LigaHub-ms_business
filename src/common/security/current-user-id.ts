import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Id del usuario de ms-security dueño del token (claim `sub`).
 * El SecurityGuard ya validó el token contra ms-security antes de llegar
 * aquí, por eso basta con leer el payload sin volver a verificar la firma.
 */
export function userIdFromAuthorization(authorization?: string): number {
  const token = authorization?.split(' ')[1];
  const payload = token?.split('.')[1];
  if (!payload) {
    throw new UnauthorizedException('Token de autorizacion faltante');
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: unknown };
    const userId = Number(claims.sub);
    if (Number.isInteger(userId) && userId > 0) return userId;
  } catch {
    // Se responde 401 abajo.
  }
  throw new UnauthorizedException('El token no identifica a un usuario');
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number =>
    userIdFromAuthorization(
      context.switchToHttp().getRequest<Request>().headers.authorization,
    ),
);
