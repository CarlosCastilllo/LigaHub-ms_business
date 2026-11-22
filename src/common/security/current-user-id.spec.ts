import { UnauthorizedException } from '@nestjs/common';
import { userIdFromAuthorization } from './current-user-id';

const tokenCon = (claims: object) =>
  `Bearer h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.firma`;

describe('userIdFromAuthorization', () => {
  it('reads the user id from the sub claim', () => {
    expect(userIdFromAuthorization(tokenCon({ sub: '7' }))).toBe(7);
  });

  it('rejects a missing header or a token without a numeric sub', () => {
    expect(() => userIdFromAuthorization(undefined)).toThrow(UnauthorizedException);
    expect(() => userIdFromAuthorization(tokenCon({ sub: 'abc' }))).toThrow(
      UnauthorizedException,
    );
    expect(() => userIdFromAuthorization('Bearer basura')).toThrow(
      UnauthorizedException,
    );
  });
});
