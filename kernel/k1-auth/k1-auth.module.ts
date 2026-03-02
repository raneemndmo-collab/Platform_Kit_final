import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity, SessionEntity, ApiKeyEntity } from './domain/entities';
import { K1AuthService } from './application/handlers/auth.service';
import { K1AuthController } from './api/controllers/auth.controller';
import { JwtRsaKeyManager } from '../../shared/jwt-rsa';

// SEC-008 FIX: RSA key pair for JWT signing (RS256 replaces HS256)
const rsaKeyManager = new JwtRsaKeyManager(parseInt(process.env['JWT_RSA_ROTATION_DAYS'] ?? '30', 10));
const activeKey = rsaKeyManager.generateKeyPair();

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SessionEntity, ApiKeyEntity], 'k1_connection'),
    JwtModule.register({
      privateKey: activeKey.privateKey,
      publicKey: activeKey.publicKey,
      signOptions: {
        issuer: 'rasid-platform',
        algorithm: 'RS256',
        expiresIn: process.env['JWT_EXPIRES_IN'] ?? '1h',
        keyid: activeKey.kid,
      },
      verifyOptions: {
        algorithms: ['RS256'],
        issuer: 'rasid-platform',
      },
    }),
  ],
  controllers: [K1AuthController],
  providers: [
    K1AuthService,
    { provide: 'JWT_RSA_KEY_MANAGER', useValue: rsaKeyManager },
  ],
  exports: [K1AuthService, JwtModule, 'JWT_RSA_KEY_MANAGER'],
})
export class K1AuthModule {}
