import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect as vExpect } from 'vitest';
import '@/i18n';
import PhotoLightbox, { LightboxPhoto } from './PhotoLightbox';

vExpect.extend(toHaveNoViolations);

const MOCK: LightboxPhoto[] = [
  { id: '1', media_url: 'https://example.com/a.jpg', thumbnail_url: null, title: 'Alpha', description: 'First photo' },
  { id: '2', media_url: 'https://example.com/b.jpg', thumbnail_url: null, title: null, description: null },
  { id: '3', media_url: 'https://example.com/c.jpg', thumbnail_url: null, title: 'Gamma', description: null },
];

afterEach(() => cleanup());

describe('PhotoLightbox accessibility', () => {
  it('exposes accessible dialog name, description and toolbar labels', () => {
    render(
      <PhotoLightbox
        photos={MOCK}
        index={0}
        open
        onOpenChange={() => {}}
        onIndexChange={() => {}}
      />
    );

    // Dialog is named (via DialogTitle) and described (via DialogDescription)
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName();
    expect(dialog).toHaveAccessibleDescription();

    // Toolbar and icon-only buttons all have accessible names
    const scoped = within(dialog);
    expect(scoped.getByRole('toolbar')).toBeInTheDocument();
    // shadcn DialogContent ships a built-in Close button too, so use getAllByRole
    for (const name of [/zoom in/i, /zoom out/i, /reset/i, /close/i, /next/i, /previous/i]) {
      expect(scoped.getAllByRole('button', { name }).length).toBeGreaterThan(0);
    }

    // Live region present for screen-reader announcements on navigation
    const live = dialog.querySelector('[role="status"][aria-live="polite"]');
    expect(live).not.toBeNull();
  });

  it('has no axe-core violations when open', async () => {
    const { container } = render(
      <PhotoLightbox
        photos={MOCK}
        index={0}
        open
        onOpenChange={() => {}}
        onIndexChange={() => {}}
      />
    );

    // Radix Dialog portals the content to document.body — scan the whole document.
    const results = await axe(document.body, {
      // Color-contrast can't be evaluated reliably in jsdom (no layout/paint)
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results).toHaveNoViolations();

    // Silence unused-var lint on container
    expect(container).toBeTruthy();
  });
});
