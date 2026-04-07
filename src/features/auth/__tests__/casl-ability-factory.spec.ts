import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import { ICaslRule } from 'src/features/auth/types';

describe('CaslAbilityFactory.createFromRules', () => {
  const factory = new CaslAbilityFactory(null as any, null as any);

  it('should allow action matching a single rule', () => {
    const rules: ICaslRule[] = [{ action: 'read', subject: 'Row' }];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
    expect(ability.can('create', 'Row')).toBe(false);
    expect(ability.can('read', 'Table')).toBe(false);
  });

  it('should handle array actions and subjects', () => {
    const rules: ICaslRule[] = [
      { action: ['read', 'create'], subject: ['Row', 'Table'] },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
    expect(ability.can('create', 'Row')).toBe(true);
    expect(ability.can('read', 'Table')).toBe(true);
    expect(ability.can('create', 'Table')).toBe(true);
    expect(ability.can('delete', 'Row')).toBe(false);
    expect(ability.can('read', 'Branch')).toBe(false);
  });

  it('should support inverted (cannot) rules', () => {
    const rules: ICaslRule[] = [
      { action: ['read', 'create', 'update', 'delete'], subject: 'Row' },
      { action: 'delete', subject: 'Row', inverted: true },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
    expect(ability.can('create', 'Row')).toBe(true);
    expect(ability.can('update', 'Row')).toBe(true);
    expect(ability.can('delete', 'Row')).toBe(false);
  });

  it('should support manage on all subjects', () => {
    const rules: ICaslRule[] = [{ action: 'manage', subject: 'all' }];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
    expect(ability.can('delete', 'Project')).toBe(true);
    expect(ability.can('update', 'Branch')).toBe(true);
  });

  it('should support conditions', () => {
    const rules: ICaslRule[] = [
      {
        action: 'read',
        subject: 'Row',
        conditions: { organizationId: 'org-1' },
      },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
  });

  it('should support field restrictions', () => {
    const rules: ICaslRule[] = [
      { action: 'read', subject: 'Row', fields: ['name', 'data'] },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Row')).toBe(true);
  });

  it('should handle multiple rules combined', () => {
    const rules: ICaslRule[] = [
      { action: 'read', subject: ['Project', 'Branch', 'Revision'] },
      { action: ['read', 'create', 'update'], subject: 'Row' },
      { action: 'read', subject: 'Table' },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('read', 'Project')).toBe(true);
    expect(ability.can('read', 'Row')).toBe(true);
    expect(ability.can('create', 'Row')).toBe(true);
    expect(ability.can('update', 'Row')).toBe(true);
    expect(ability.can('delete', 'Row')).toBe(false);
    expect(ability.can('create', 'Table')).toBe(false);
    expect(ability.can('read', 'Table')).toBe(true);
  });

  it('should return empty abilities for empty rules', () => {
    const ability = factory.createFromRules([]);

    expect(ability.can('read', 'Row')).toBe(false);
  });

  it('should support conditions with fields together', () => {
    const rules: ICaslRule[] = [
      {
        action: 'update',
        subject: 'Row',
        fields: ['data'],
        conditions: { tableId: 'products' },
      },
    ];
    const ability = factory.createFromRules(rules);

    expect(ability.can('update', 'Row')).toBe(true);
    expect(ability.can('delete', 'Row')).toBe(false);
  });
});
