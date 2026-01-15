import { BadRequestException } from '@nestjs/common';
import {
  validateBranchName,
  RESERVED_BRANCH_NAME_ERROR_MESSAGE,
} from './validateBranchName';
import { VALIDATE_URL_LIKE_ID_ERROR_MESSAGE } from './validateUrlLikeId';

describe('validateBranchName', () => {
  describe('valid branch names', () => {
    it('should pass for valid branch names', () => {
      expect(() => validateBranchName('main')).not.toThrow();
      expect(() => validateBranchName('master')).not.toThrow();
      expect(() => validateBranchName('feature-branch')).not.toThrow();
      expect(() => validateBranchName('feature_branch')).not.toThrow();
      expect(() => validateBranchName('release-v1')).not.toThrow();
      expect(() => validateBranchName('_private')).not.toThrow();
    });
  });

  describe('format validation', () => {
    it('should fail for branch names starting with numbers', () => {
      expect(() => validateBranchName('1branch')).toThrow(BadRequestException);
      expect(() => validateBranchName('1branch')).toThrow(
        VALIDATE_URL_LIKE_ID_ERROR_MESSAGE,
      );
    });

    it('should fail for branch names starting with double underscores', () => {
      expect(() => validateBranchName('__branch')).toThrow(BadRequestException);
    });

    it('should fail for branch names with invalid characters', () => {
      expect(() => validateBranchName('feature/branch')).toThrow(
        BadRequestException,
      );
      expect(() => validateBranchName('feature branch')).toThrow(
        BadRequestException,
      );
    });

    it('should fail for empty branch names', () => {
      expect(() => validateBranchName('')).toThrow(BadRequestException);
    });

    it('should fail for branch names exceeding max length', () => {
      expect(() => validateBranchName('a'.repeat(65))).toThrow(
        BadRequestException,
      );
    });
  });

  describe('reserved names', () => {
    it('should fail for reserved branch name "head"', () => {
      expect(() => validateBranchName('head')).toThrow(BadRequestException);
      expect(() => validateBranchName('head')).toThrow(
        RESERVED_BRANCH_NAME_ERROR_MESSAGE,
      );
    });

    it('should fail for reserved branch name "draft"', () => {
      expect(() => validateBranchName('draft')).toThrow(BadRequestException);
      expect(() => validateBranchName('draft')).toThrow(
        RESERVED_BRANCH_NAME_ERROR_MESSAGE,
      );
    });

    it('should be case-insensitive for reserved names', () => {
      expect(() => validateBranchName('Head')).toThrow(BadRequestException);
      expect(() => validateBranchName('HEAD')).toThrow(BadRequestException);
      expect(() => validateBranchName('Draft')).toThrow(BadRequestException);
      expect(() => validateBranchName('DRAFT')).toThrow(BadRequestException);
    });
  });
});
