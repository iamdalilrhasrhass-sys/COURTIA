const { isAdminRole } = require('../constants/roles');

describe('Role Authorization Helpers (isAdminRole)', () => {
  it('accepts super_admin and admin roles', () => {
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('owner')).toBe(true);
  });

  it('rejects standard user roles', () => {
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('broker')).toBe(false);
    expect(isAdminRole('assistant')).toBe(false);
    expect(isAdminRole('viewer')).toBe(false);
  });

  it('rejects empty, null or unknown roles', () => {
    expect(isAdminRole('')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('inconnu')).toBe(false);
  });
});
