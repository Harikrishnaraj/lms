import { expect, type Page, type Response } from '@playwright/test';

/**
 * Every portal page in this app is a client component that renders a
 * loading state, then either data or an error state. There is no
 * data-testid anywhere in apps/web (verified: zero occurrences), so these
 * helpers centralise the role/text selectors — when testids are added,
 * only this file changes.
 */

/** Text the shared ErrorState component renders. */
export const ERROR_STATE_TEXT = /something went wrong/i;
/** Text the shared loading components render. */
export const LOADING_TEXT = /loading/i;

/**
 * Waits for a page to finish its initial data fetch: the loading state
 * must disappear. Asserts the loading state was actually reachable rather
 * than silently passing on a page that never loads anything.
 */
export async function waitForDataSettled(page: Page): Promise<void> {
  const loading = page.getByText(LOADING_TEXT).first();
  // The fetch can resolve faster than the first poll, so a missing loading
  // state is not a failure — only a stuck one is.
  await expect
    .poll(async () => ((await loading.count()) > 0 ? await loading.isVisible() : false), {
      timeout: 30_000,
      message: 'Page never finished loading',
    })
    .toBe(false);
}

/** True once the page has settled into the shared error state. */
export async function isInErrorState(page: Page): Promise<boolean> {
  return (await page.getByText(ERROR_STATE_TEXT).count()) > 0;
}

/**
 * Captures every API call a page makes, so a spec can assert the rendered
 * DOM against the real response body rather than against a fixture.
 */
export function recordApiResponses(page: Page, pathFragment: string): Promise<Response>[] {
  const collected: Promise<Response>[] = [];
  page.on('response', (response) => {
    if (response.url().includes(pathFragment)) {
      collected.push(Promise.resolve(response));
    }
  });
  return collected;
}

/** Waits for the specific API response backing a page, and returns its JSON. */
export async function captureApiJson<T = unknown>(
  page: Page,
  pathFragment: string,
  navigate: () => Promise<unknown>,
): Promise<{ status: number; body: T | null }> {
  const waiter = page.waitForResponse(
    (response) => response.url().includes(pathFragment),
    { timeout: 30_000 },
  );
  await navigate();
  const response = await waiter;
  let body: T | null = null;
  try {
    body = (await response.json()) as T;
  } catch {
    body = null;
  }
  return { status: response.status(), body };
}
