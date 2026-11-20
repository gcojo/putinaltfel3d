import { describe, expect, it } from 'vitest';
import { loginToEmail } from './login';

describe('loginToEmail', () => {
  it('transformă numele de utilizator în adresa internă', () => {
    expect(loginToEmail('admin')).toBe('admin@putinaltfel3d.local');
    expect(loginToEmail('  Admin ')).toBe('admin@putinaltfel3d.local');
  });
  it('lasă emailurile neschimbate', () => {
    expect(loginToEmail('Cineva@Exemplu.ro')).toBe('cineva@exemplu.ro');
  });
  it('respinge valorile invalide', () => {
    expect(loginToEmail('')).toBeNull();
    expect(loginToEmail('ad min')).toBeNull();
    expect(loginToEmail('fara@domeniu')).toBeNull();
  });
});
