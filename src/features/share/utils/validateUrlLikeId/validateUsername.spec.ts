import { BadRequestException } from '@nestjs/common';
import {
  validateUsername,
  RESERVED_USERNAME_ERROR_MESSAGE,
} from './validateUsername';
import { VALIDATE_URL_LIKE_ID_ERROR_MESSAGE } from './validateUrlLikeId';

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('should pass for valid usernames', () => {
      expect(() => validateUsername('john')).not.toThrow();
      expect(() => validateUsername('john_doe')).not.toThrow();
      expect(() => validateUsername('john-doe')).not.toThrow();
      expect(() => validateUsername('JohnDoe123')).not.toThrow();
      expect(() => validateUsername('_private')).not.toThrow();
    });
  });

  describe('format validation', () => {
    it('should fail for usernames starting with numbers', () => {
      expect(() => validateUsername('1john')).toThrow(BadRequestException);
      expect(() => validateUsername('1john')).toThrow(
        VALIDATE_URL_LIKE_ID_ERROR_MESSAGE,
      );
    });

    it('should fail for usernames starting with double underscores', () => {
      expect(() => validateUsername('__john')).toThrow(BadRequestException);
    });

    it('should fail for usernames with invalid characters', () => {
      expect(() => validateUsername('john@doe')).toThrow(BadRequestException);
      expect(() => validateUsername('john doe')).toThrow(BadRequestException);
      expect(() => validateUsername('john.doe')).toThrow(BadRequestException);
    });

    it('should fail for empty usernames', () => {
      expect(() => validateUsername('')).toThrow(BadRequestException);
    });

    it('should fail for usernames exceeding max length', () => {
      expect(() => validateUsername('a'.repeat(65))).toThrow(
        BadRequestException,
      );
    });
  });

  describe('reserved names', () => {
    it('should fail for reserved auth-related usernames', () => {
      expect(() => validateUsername('login')).toThrow(BadRequestException);
      expect(() => validateUsername('login')).toThrow(
        RESERVED_USERNAME_ERROR_MESSAGE,
      );
      expect(() => validateUsername('logout')).toThrow(BadRequestException);
      expect(() => validateUsername('signup')).toThrow(BadRequestException);
      expect(() => validateUsername('auth')).toThrow(BadRequestException);
    });

    it('should fail for reserved system usernames', () => {
      expect(() => validateUsername('admin')).toThrow(BadRequestException);
      expect(() => validateUsername('api')).toThrow(BadRequestException);
      expect(() => validateUsername('graphql')).toThrow(BadRequestException);
      expect(() => validateUsername('system')).toThrow(BadRequestException);
      expect(() => validateUsername('root')).toThrow(BadRequestException);
    });

    it('should fail for reserved brand usernames', () => {
      expect(() => validateUsername('revisium')).toThrow(BadRequestException);
      expect(() => validateUsername('revisium-admin')).toThrow(
        BadRequestException,
      );
    });

    it('should fail for reserved common page usernames', () => {
      expect(() => validateUsername('help')).toThrow(BadRequestException);
      expect(() => validateUsername('support')).toThrow(BadRequestException);
      expect(() => validateUsername('about')).toThrow(BadRequestException);
      expect(() => validateUsername('settings')).toThrow(BadRequestException);
    });

    it('should be case-insensitive for reserved names', () => {
      expect(() => validateUsername('Admin')).toThrow(BadRequestException);
      expect(() => validateUsername('ADMIN')).toThrow(BadRequestException);
      expect(() => validateUsername('AdMiN')).toThrow(BadRequestException);
      expect(() => validateUsername('LOGIN')).toThrow(BadRequestException);
      expect(() => validateUsername('Revisium')).toThrow(BadRequestException);
    });
  });
});
