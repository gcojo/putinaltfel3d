// Navigarea reală prin meniu, cu paginile încărcate la cerere (lazy), ca în producție.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { clients, payments, seedLike, settings } from './fixtures';

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    session: { user: { id: 'u', email: 'admin@test.ro' } },
    loading: false,
    signIn: async () => null,
    signOut: async () => {},
  }),
}));

vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return {
    ...real,
    fetchAll: async () => ({ clients, orders: seedLike(), payments, settings }),
    fetchEvents: async () => [],
  };
});

describe('navigare prin meniu', () => {
  it('schimbă pagina la click, fără refresh', async () => {
    const { AppRoutes } = await import('@/App');
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Printer board')).toBeTruthy();

    const go = async (label: string, expected: string) => {
      const link = screen.getAllByRole('link').find((a) => a.textContent?.trim() === label || a.getAttribute('aria-label') === label || a.querySelector('span')?.textContent === label);
      expect(link, `link ${label}`).toBeTruthy();
      await act(async () => {
        fireEvent.click(link!);
      });
      expect(await screen.findByText(expected, {}, { timeout: 3000 })).toBeTruthy();
    };

    await go('Comenzi', 'CSV comenzi');
    await go('Coadă', 'Ordinea de printare');
    await go('Clienți', 'Top după bani');
    await go('Statistici', 'Cele mai profitabile comenzi');
    await go('Dashboard', 'Printer board');
    await go('Comenzi', 'CSV comenzi');
  }, 15_000); // test de integrare lent: 6 pagini încărcate la cerere
});
