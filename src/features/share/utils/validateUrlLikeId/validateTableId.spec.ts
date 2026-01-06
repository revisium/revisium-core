import { BadRequestException } from '@nestjs/common';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { validateTableId } from 'src/features/share/utils/validateUrlLikeId/validateTableId';

describe('validateTableId', () => {
  describe('valid table IDs', () => {
    it('should pass for simple lowercase names', () => {
      expect(() => validateTableId('users')).not.toThrow();
      expect(() => validateTableId('posts')).not.toThrow();
    });

    it('should pass for names with underscores', () => {
      expect(() => validateTableId('user_data')).not.toThrow();
      expect(() => validateTableId('user_profile_settings')).not.toThrow();
    });

    it('should pass for names with hyphens', () => {
      expect(() => validateTableId('user-data')).not.toThrow();
      expect(() => validateTableId('user-profile-settings')).not.toThrow();
    });

    it('should pass for names starting with underscore', () => {
      expect(() => validateTableId('_private')).not.toThrow();
      expect(() => validateTableId('_internal_table')).not.toThrow();
    });

    it('should pass for system tables with double underscore', () => {
      expect(() => validateTableId('__schema')).not.toThrow();
      expect(() => validateTableId('__migration')).not.toThrow();
      expect(() => validateTableId('__views')).not.toThrow();
    });

    it('should pass for single character names', () => {
      expect(() => validateTableId('a')).not.toThrow();
      expect(() => validateTableId('Z')).not.toThrow();
      expect(() => validateTableId('_')).not.toThrow();
    });

    it('should pass for names with digits (not at start)', () => {
      expect(() => validateTableId('table1')).not.toThrow();
      expect(() => validateTableId('users2024')).not.toThrow();
      expect(() => validateTableId('a123')).not.toThrow();
    });

    it('should pass for mixed case names', () => {
      expect(() => validateTableId('Users')).not.toThrow();
      expect(() => validateTableId('UserData')).not.toThrow();
      expect(() => validateTableId('USERS')).not.toThrow();
    });

    it('should pass for max length names (64 chars)', () => {
      expect(() => validateTableId('a'.repeat(64))).not.toThrow();
    });
  });

  describe('invalid table IDs - starting with digit', () => {
    it('should fail for names starting with digit', () => {
      expect(() => validateTableId('1table')).toThrow(BadRequestException);
      expect(() => validateTableId('123')).toThrow(BadRequestException);
      expect(() => validateTableId('1')).toThrow(BadRequestException);
      expect(() => validateTableId('9users')).toThrow(BadRequestException);
    });
  });

  describe('invalid table IDs - starting with hyphen', () => {
    it('should fail for names starting with hyphen', () => {
      expect(() => validateTableId('-table')).toThrow(BadRequestException);
      expect(() => validateTableId('-')).toThrow(BadRequestException);
      expect(() => validateTableId('--test')).toThrow(BadRequestException);
    });
  });

  describe('invalid table IDs - unicode characters', () => {
    it('should fail for cyrillic characters', () => {
      expect(() => validateTableId('таблица')).toThrow(BadRequestException);
      expect(() => validateTableId('users_данные')).toThrow(
        BadRequestException,
      );
    });

    it('should fail for japanese characters', () => {
      expect(() => validateTableId('テーブル')).toThrow(BadRequestException);
    });

    it('should fail for chinese characters', () => {
      expect(() => validateTableId('表格')).toThrow(BadRequestException);
    });

    it('should fail for emoji', () => {
      expect(() => validateTableId('users👍')).toThrow(BadRequestException);
    });
  });

  describe('invalid table IDs - special characters', () => {
    it('should fail for names with spaces', () => {
      expect(() => validateTableId('user data')).toThrow(BadRequestException);
      expect(() => validateTableId(' users')).toThrow(BadRequestException);
      expect(() => validateTableId('users ')).toThrow(BadRequestException);
    });

    it('should fail for names with special characters', () => {
      expect(() => validateTableId('user$data')).toThrow(BadRequestException);
      expect(() => validateTableId('user@data')).toThrow(BadRequestException);
      expect(() => validateTableId('user.data')).toThrow(BadRequestException);
      expect(() => validateTableId('user/data')).toThrow(BadRequestException);
      expect(() => validateTableId('user\\data')).toThrow(BadRequestException);
      expect(() => validateTableId('user:data')).toThrow(BadRequestException);
      expect(() => validateTableId('user*data')).toThrow(BadRequestException);
    });
  });

  describe('invalid table IDs - length constraints', () => {
    it('should fail for empty string', () => {
      expect(() => validateTableId('')).toThrow(BadRequestException);
    });

    it('should fail for names exceeding max length (65 chars)', () => {
      expect(() => validateTableId('a'.repeat(65))).toThrow(
        BadRequestException,
      );
    });

    it('should fail for very long names', () => {
      expect(() => validateTableId('a'.repeat(100))).toThrow(
        BadRequestException,
      );
    });
  });

  describe('invalid table IDs - system table prefix', () => {
    it('should fail for names starting with system table prefix', () => {
      expect(() => validateTableId('revisium_custom')).toThrow(
        BadRequestException,
      );
      expect(() => validateTableId('revisium_')).toThrow(BadRequestException);
      expect(() => validateTableId('revisium_test_table')).toThrow(
        BadRequestException,
      );
    });

    it('should fail for actual system table names', () => {
      expect(() => validateTableId(SystemTables.Schema)).toThrow(
        BadRequestException,
      );
      expect(() => validateTableId(SystemTables.Migration)).toThrow(
        BadRequestException,
      );
      expect(() => validateTableId(SystemTables.SharedSchemas)).toThrow(
        BadRequestException,
      );
      expect(() => validateTableId(SystemTables.Views)).toThrow(
        BadRequestException,
      );
    });

    it('should pass for names containing but not starting with prefix', () => {
      expect(() => validateTableId('my_revisium_table')).not.toThrow();
      expect(() => validateTableId('table_revisium_data')).not.toThrow();
    });

    it('should pass for similar but different prefixes', () => {
      expect(() => validateTableId('revisiumtable')).not.toThrow();
      expect(() => validateTableId('revisiumschema')).not.toThrow();
    });
  });
});
