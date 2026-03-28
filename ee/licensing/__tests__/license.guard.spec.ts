import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseGuard } from '../license.guard';
import { LicenseService } from '../license.service';

describe('LicenseGuard', () => {
  let guard: LicenseGuard;
  let reflector: Reflector;
  let licenseService: jest.Mocked<Pick<LicenseService, 'hasFeature'>>;

  beforeEach(() => {
    reflector = new Reflector();
    licenseService = {
      hasFeature: jest.fn(),
    };
    guard = new LicenseGuard(
      reflector,
      licenseService as unknown as LicenseService,
    );
  });

  const createContext = (): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow access when no @EeFeature decorator', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('should allow access when feature is licensed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('billing');
    licenseService.hasFeature.mockReturnValue(true);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(licenseService.hasFeature).toHaveBeenCalledWith('billing');
  });

  it('should throw ForbiddenException when feature is not licensed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('billing');
    licenseService.hasFeature.mockReturnValue(false);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(createContext())).toThrow(
      'Enterprise feature "billing" requires a valid license',
    );
  });
});
