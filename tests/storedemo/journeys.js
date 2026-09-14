// @ts-check
import {
  test,
  expect,
  think,
  openHome,
  openCatalogue,
  productCards,
  openNthProduct,
  addCurrentProductToCart,
  openCartDrawer,
  closeCartDrawer,
  money,
  signUp,
  logIn,
  signUpAndLogIn,
  PASSWORD,
} from './support.js';

/**
 * 20 shopper journeys against storedemo.testdino.com.
 *
 * The run-mode spec files (sequential, sharded, ...) register these same
 * journeys, so the only thing that differs between them is how Playwright
 * schedules the work.
 *
 * Store quirks these journeys work around:
 * - /product/<slug> only renders via in-app navigation, so products are opened
 *   by clicking a card, never by page.goto.
 * - The demo API rejects createOrder ("Token Missing"), so checkout journeys
 *   stop before placing the order.
 */

/** @type {{ title: string, run: (args: { page: import('@playwright/test').Page }) => Promise<void> }[]} */
export const journeys = [
  {
    title: 'home page shows every storefront section',
    run: async ({ page }) => {
      await test.step('Open the storefront', async () => {
        await openHome(page);
        await expect(page).toHaveTitle(/TestDino Demo Store/);
        await expect(page.getByTestId('hero-title')).toBeVisible();
      });
      await test.step('Scroll through the landing sections', async () => {
        for (const section of [
          'product-categories',
          'featured-products-section',
          'offers-section',
          'new-arrivals-section',
          'category-products-section',
          'subscribe-section',
        ]) {
          await page.getByTestId(section).scrollIntoViewIfNeeded();
          await expect(page.getByTestId(section)).toBeVisible();
          await think(page);
        }
      });
      await test.step('All four categories are listed', async () => {
        for (const category of ['camera', 'appliances', 'gadgets', 'laptop']) {
          await expect(page.getByTestId(`category-title-${category}`)).toBeVisible();
        }
        await expect(page.getByTestId('feature-card-header').first()).toBeVisible();
      });
    },
  },

  {
    title: 'header menu navigates between the main pages',
    run: async ({ page }) => {
      await openHome(page);
      const stops = [
        ['header-menu-all-products', 'all-products-title', /\/products$/],
        ['header-menu-about-us', 'about-us-title', /\/about-us$/],
        ['header-menu-contact-us', 'contact-us-heading', /\/contact-us$/],
        ['header-menu-home', 'hero-section', /\/$/],
      ];
      for (let lap = 1; lap <= 2; lap++) {
        await test.step(`Menu lap ${lap}`, async () => {
          for (const [menu, landmark, url] of stops) {
            await page.getByTestId(menu).click();
            await expect(page.getByTestId(landmark)).toBeVisible({ timeout: 30_000 });
            await expect(page).toHaveURL(url);
            await think(page);
          }
        });
      }
      await test.step('Logo returns to the home page', async () => {
        await page.getByTestId('header-menu-all-products').click();
        await expect(page.getByTestId('all-products-title')).toBeVisible();
        await page.getByTestId('header-logo').click();
        await expect(page.getByTestId('hero-section')).toBeVisible();
      });
    },
  },

  {
    title: 'footer useful links open their pages',
    run: async ({ page }) => {
      await openHome(page);
      for (const [link, landmark] of [
        ['footer-all-products', 'all-products-title'],
        ['footer-about-us', 'about-us-title'],
        ['footer-contact-us', 'contact-us-heading'],
        ['footer-home', 'hero-section'],
      ]) {
        await test.step(`Footer: ${link}`, async () => {
          await page.getByTestId(link).scrollIntoViewIfNeeded();
          await think(page);
          await page.getByTestId(link).click();
          await expect(page.getByTestId(landmark)).toBeVisible({ timeout: 30_000 });
          await think(page);
        });
      }
    },
  },

  {
    title: 'customer policy pages are readable from the footer',
    run: async ({ page }) => {
      await openHome(page);
      for (const [link, heading] of [
        ['footer-policy-shipping-policy', 'Shipping Policy'],
        ['footer-policy-return-policy', /Return/],
        ['footer-policy-cancellation', /Cancellation/],
        ['footer-policy-faq', 'Frequently Asked Questions'],
      ]) {
        await test.step(`Read ${link}`, async () => {
          await page.getByTestId(link).scrollIntoViewIfNeeded();
          await page.getByTestId(link).click();
          await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 30_000 });
          await expect(page.getByRole('heading', { level: 2 }).nth(1)).toBeVisible();
          await page.mouse.wheel(0, 1200);
          await think(page);
        });
      }
    },
  },

  {
    title: 'legal pages and social links are present',
    run: async ({ page }) => {
      await openHome(page);
      await test.step('Social icons link out', async () => {
        for (const icon of ['footer-twitter-icon', 'footer-linkedin-icon', 'footer-github-icon']) {
          await expect(page.getByTestId(icon)).toBeVisible();
        }
        await expect(page.getByTestId('footer-copyright')).toContainText(/TestDino|©/);
      });
      for (const [link, heading] of [
        ['footer-privacy-policy', /Privacy/],
        ['footer-terms-of-service', /Terms/],
      ]) {
        await test.step(`Read ${link}`, async () => {
          await page.getByTestId(link).scrollIntoViewIfNeeded();
          await page.getByTestId(link).click();
          await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 30_000 });
          await page.mouse.wheel(0, 1500);
          await think(page);
        });
      }
    },
  },

  {
    title: 'hero and offer banners lead to the catalogue',
    run: async ({ page }) => {
      for (const cta of ['hero-shop-now', 'offer-shop-now-1', 'offer-shop-now-2']) {
        await test.step(`Click ${cta}`, async () => {
          await openHome(page);
          await page.getByTestId(cta).scrollIntoViewIfNeeded();
          await think(page);
          await page.getByTestId(cta).click();
          await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
          await expect(productCards(page).first()).toBeVisible();
          await think(page);
        });
      }
    },
  },

  {
    title: 'category explore links open the catalogue',
    run: async ({ page }) => {
      for (const category of ['camera', 'appliances', 'gadgets', 'laptop']) {
        await test.step(`Explore ${category}`, async () => {
          await openHome(page);
          await page.getByTestId(`category-explore-more-${category}`).scrollIntoViewIfNeeded();
          await think(page);
          await page.getByTestId(`category-explore-more-${category}`).click();
          await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
          await expect(page.getByTestId('all-products-results-count')).toContainText(/Showing \d+ products?/);
          await think(page);
        });
      }
    },
  },

  {
    title: 'catalogue search narrows results by name',
    run: async ({ page }) => {
      await openCatalogue(page);
      const total = await productCards(page).count();
      expect(total).toBeGreaterThan(5);
      const search = page.getByTestId('all-products-search-input');

      for (const term of ['apple', 'sandisk', 'gopro', 'laptop']) {
        await test.step(`Search "${term}"`, async () => {
          await search.fill(term);
          await expect.poll(() => productCards(page).count()).toBeLessThan(total);
          const count = await productCards(page).count();
          expect(count).toBeGreaterThan(0);
          await expect(page.getByTestId('all-products-results-count')).toContainText(`Showing ${count} product`);
          for (const name of await productCards(page).locator('h1, h2, h3').allInnerTexts()) {
            expect(name.toLowerCase()).toContain(term);
          }
          await think(page);
        });
      }

      await test.step('Clearing the search restores the full catalogue', async () => {
        await search.fill('');
        await expect(productCards(page)).toHaveCount(total);
      });
    },
  },

  {
    title: 'catalogue filters and view switcher',
    run: async ({ page }) => {
      await openCatalogue(page);
      const total = await productCards(page).count();

      await test.step('Switch between list and grid views', async () => {
        for (const view of ['list', 'grid', 'list', 'grid']) {
          await page.getByTestId(`all-products-view-switcher-${view}`).click();
          await expect(productCards(page).first()).toBeVisible();
          await think(page, 800);
        }
      });

      await test.step('Filter by category', async () => {
        await page.getByTestId('all-products-filter-toggle').click();
        const select = page.getByTestId('all-products-category-select');
        await expect(select).toBeVisible();
        const options = await select.locator('option').allInnerTexts();
        const category = options.find((o) => o.trim() && !/all/i.test(o));
        test.skip(!category, 'category select has no concrete options');
        await select.selectOption({ label: category });
        await expect.poll(() => productCards(page).count()).toBeLessThan(total);
        await think(page);
      });

      await test.step('Reset filters restores the catalogue', async () => {
        await page.getByTestId('all-products-reset-filters-button').click();
        await expect(productCards(page)).toHaveCount(total);
      });
    },
  },

  {
    title: 'product details tabs across several products',
    run: async ({ page }) => {
      for (const n of [0, 3, 6]) {
        await test.step(`Inspect product #${n + 1}`, async () => {
          await openCatalogue(page);
          const name = await openNthProduct(page, n);
          await expect(page.getByTestId('product-price')).toContainText(/\d/);
          await expect(page.getByTestId('product-image')).toBeVisible();

          await page.getByTestId('additional-info-tab').click();
          await think(page, 800);
          await page.getByTestId('reviews-tab').click();
          await think(page, 800);
          await page.getByTestId('description-tab').click();
          await expect(page.getByTestId('description-content')).toBeVisible();
          await expect(page.getByTestId('product-name')).toHaveText(name);
          await think(page);
        });
      }
    },
  },

  {
    title: 'you may also like chains through related products',
    run: async ({ page }) => {
      await openCatalogue(page);
      const visited = [await openNthProduct(page, 1)];

      for (let hop = 1; hop <= 4; hop++) {
        await test.step(`Related product hop ${hop}`, async () => {
          await page.getByTestId('you-may-also-like-title').scrollIntoViewIfNeeded();
          // A carousel: cards slid off-screen still count as visible but can't be clicked.
          const cards = page.getByTestId('feature-card-header');
          await expect(cards.first()).toBeAttached();
          const readCards = () =>
            cards.evaluateAll((els) =>
              els.map((el) => {
                const r = el.getBoundingClientRect();
                return { name: el.textContent.trim(), onScreen: r.width > 0 && r.left >= 0 && r.right <= window.innerWidth };
              }),
            );
          let onScreen = await readCards();
          let next = onScreen.findIndex((c) => c.onScreen && !visited.includes(c.name));
          for (let slide = 0; next < 0 && slide < 6; slide++) {
            await page.getByRole('img', { name: 'right' }).first().click();
            await think(page, 700);
            onScreen = await readCards();
            next = onScreen.findIndex((c) => c.onScreen && !visited.includes(c.name));
          }
          expect(next, 'an on-screen related product not visited yet').toBeGreaterThanOrEqual(0);
          await think(page);
          await cards.nth(next).click();
          await expect(page.getByTestId('product-name')).toHaveText(onScreen[next].name, { timeout: 30_000 });
          visited.push(onScreen[next].name);
        });
      }
      expect(new Set(visited).size).toBe(visited.length);
    },
  },

  {
    title: 'guest adds several products to the cart drawer',
    run: async ({ page }) => {
      const added = [];
      for (const n of [0, 2, 4]) {
        await test.step(`Add product #${n + 1}`, async () => {
          await openCatalogue(page);
          added.push(await openNthProduct(page, n));
          await addCurrentProductToCart(page);
          await think(page);
        });
      }

      await test.step('Drawer lists every product with a matching subtotal', async () => {
        await openCartDrawer(page);
        const drawer = page.getByTestId('cart-drawer');
        await expect(drawer.getByTestId('cart-item')).toHaveCount(added.length);
        for (const name of added) await expect(drawer.getByTestId('cart-item-header').filter({ hasText: name })).toBeVisible();

        const prices = (await drawer.getByTestId('item-price').allInnerTexts()).map(money);
        const quantities = (await drawer.getByTestId('item-quantity').allInnerTexts()).map(Number);
        const expected = prices.reduce((sum, p, i) => sum + p * (quantities[i] || 1), 0);
        expect(money(await drawer.getByTestId('subtotal-value').innerText())).toBeCloseTo(expected, 0);
        await closeCartDrawer(page);
      });
    },
  },

  {
    title: 'cart page quantity changes update the totals',
    run: async ({ page }) => {
      await openCatalogue(page);
      await openNthProduct(page, 1);
      await addCurrentProductToCart(page);
      await openCartDrawer(page);
      await page.getByTestId('view-cart-button').click();
      await expect(page.getByTestId('cart-title')).toBeVisible();

      const unit = money(await page.getByTestId('cart-price').first().innerText());
      const quantity = page.getByTestId('cart-quantity').first();
      const subtotal = page.getByTestId('cart-order-summary-subtotal-value');

      for (const [action, expectedQty] of [['increment', 2], ['increment', 3], ['increment', 4], ['decrement', 3], ['decrement', 2]]) {
        await test.step(`${action} to ${expectedQty}`, async () => {
          await page.getByTestId(`cart-${action}-button`).first().click();
          await expect(quantity).toHaveText(String(expectedQty));
          await expect.poll(async () => money(await subtotal.innerText())).toBeCloseTo(unit * expectedQty, 0);
          await think(page);
        });
      }
    },
  },

  {
    title: 'removing every cart item shows the empty cart',
    run: async ({ page }) => {
      for (const n of [5, 7]) {
        await openCatalogue(page);
        await openNthProduct(page, n);
        await addCurrentProductToCart(page);
        await think(page);
      }
      await openCartDrawer(page);
      await page.getByTestId('view-cart-button').click();
      await expect(page.getByTestId('cart-title')).toBeVisible();

      await test.step('Delete items one by one', async () => {
        const deletes = page.getByTestId('cart-delete-button');
        await expect(deletes).toHaveCount(2);
        for (let left = 1; left >= 0; left--) {
          await deletes.first().click();
          await expect(deletes).toHaveCount(left);
          await think(page);
        }
      });

      await test.step('Empty cart offers to continue shopping', async () => {
        await expect(page.getByTestId('cart-empty-title')).toBeVisible();
        await page.getByTestId('cart-continue-shopping-button').click();
        await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
      });
    },
  },

  {
    title: 'wishlist add and remove from the catalogue',
    run: async ({ page }) => {
      await page.goto('/wishlist');
      await expect(page.getByTestId('wishlist-empty-title')).toBeVisible({ timeout: 30_000 });
      await page.getByTestId('wishlist-shop-now-button').click();
      await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });

      const names = [];
      await test.step('Heart two products', async () => {
        for (const n of [0, 3]) {
          const card = productCards(page).nth(n);
          names.push((await card.locator('h1, h2, h3').first().innerText()).trim());
          await card.hover();
          await page.getByTestId('all-products-wishlist-button').nth(n).click({ force: true });
          await expect(page.getByRole('status').filter({ hasText: 'Added to the wishlist' }).first()).toBeVisible();
          await think(page);
        }
        await expect(page.getByTestId('header-wishlist-count')).toHaveText('2');
      });

      await test.step('Wishlist page lists both products', async () => {
        await page.getByTestId('header-wishlist-button').click();
        await expect(page.getByTestId('wishlist-title')).toBeVisible();
        for (const name of names) await expect(page.getByText(name).first()).toBeVisible();
        await think(page);
      });

      await test.step('Un-heart them from the catalogue', async () => {
        await page.getByTestId('wishlist-back-button').click();
        await page.getByTestId('header-menu-all-products').click();
        await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
        for (const n of [0, 3]) {
          await productCards(page).nth(n).hover();
          await page.getByTestId('all-products-wishlist-button').nth(n).click({ force: true });
          await expect(page.getByRole('status').filter({ hasText: 'Removed from wishlist' }).first()).toBeVisible();
          await think(page);
        }
        await page.getByTestId('header-wishlist-button').click();
        await expect(page.getByTestId('wishlist-empty-title')).toBeVisible();
      });
    },
  },

  {
    title: 'newsletter subscription and contact form submission',
    run: async ({ page }) => {
      await test.step('Subscribe to the newsletter', async () => {
        await openHome(page);
        await page.getByTestId('subscribe-section').scrollIntoViewIfNeeded();
        await page.getByTestId('email-input').fill(`newsletter.${Date.now()}@example.com`);
        await think(page);
        await page.getByTestId('subscribe-button').click();
        await expect(page.getByRole('status').filter({ hasText: 'Subscribed successfully!' }).first()).toBeVisible();
      });

      await test.step('Send a message through Contact Us', async () => {
        await page.getByTestId('header-menu-contact-us').click();
        await expect(page.getByTestId('contact-us-form')).toBeVisible({ timeout: 30_000 });
        await page.getByTestId('contact-us-first-name-input').pressSequentially('Dino', { delay: 60 });
        await page.getByTestId('contact-us-last-name-input').pressSequentially('Tester', { delay: 60 });
        await page.getByTestId('contact-us-subject-input').pressSequentially('Question about delivery', { delay: 40 });
        await page.getByTestId('contact-us-message-input').pressSequentially(
          'Hi team, does the GoPro HERO10 ship with a spare battery? Thanks!',
          { delay: 25 },
        );
        await page.getByTestId('contact-us-submit-button').click();
        await expect(page.getByText('Your message has been sent successfully!')).toBeVisible();
        await expect(page.getByTestId('contact-us-first-name-input')).toHaveValue('');
      });
    },
  },

  {
    title: 'new shopper signs up and sees their account',
    run: async ({ page }) => {
      const account = await test.step('Create an account from the login page', async () => {
        await openHome(page);
        await page.getByTestId('header-user-icon').click();
        await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 30_000 });
        await page.getByTestId('login-signup-link').click();
        await expect(page.getByTestId('signup-title')).toBeVisible();
        return signUp(page, { firstName: 'Ada', lastName: 'Lovelace' });
      });

      await test.step('Log in with the new account', async () => {
        await expect(page.getByRole('status').filter({ hasText: 'Account created successfully' }).first()).toBeVisible();
        await logIn(page, account.email);
        await expect(page.getByRole('status').filter({ hasText: 'Logged in successfully' }).first()).toBeVisible({ timeout: 45_000 });
      });

      await test.step('My Account shows the profile', async () => {
        await page.getByTestId('header-user-icon').click();
        await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
        await expect(page.getByTestId('my-profile-firstname-input')).toHaveValue(account.firstName);
        await expect(page.getByTestId('my-profile-lastname-input')).toHaveValue(account.lastName);
        await expect(page.getByTestId('my-profile-email-input')).toHaveValue(account.email);
        await think(page);
      });
    },
  },

  {
    title: 'login rejects a wrong password then accepts the right one',
    run: async ({ page }) => {
      const { email } = await signUp(page);

      await test.step('Wrong password keeps the shopper on the login page', async () => {
        await logIn(page, email, 'not-the-password');
        await think(page, 3_000);
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('status').filter({ hasText: 'Logged in successfully' })).toHaveCount(0);
      });

      await test.step('Unknown email is rejected too', async () => {
        await logIn(page, `nobody.${Date.now()}@example.com`, PASSWORD);
        await think(page, 3_000);
        await expect(page).toHaveURL(/\/login$/);
      });

      await test.step('Correct password logs in and lands on home', async () => {
        await logIn(page, email);
        await expect(page.getByRole('status').filter({ hasText: 'Logged in successfully' }).first()).toBeVisible({ timeout: 45_000 });
        await expect(page.getByTestId('hero-section')).toBeVisible();
        await page.getByTestId('header-user-icon').click();
        await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
      });
    },
  },

  {
    title: 'logged-in shopper updates their profile details',
    run: async ({ page }) => {
      await signUpAndLogIn(page, { firstName: 'Grace', lastName: 'Hopper' });
      await page.getByTestId('header-user-icon').click();
      await expect(page.getByTestId('my-profile-firstname-input')).toHaveValue('Grace', { timeout: 30_000 });

      await test.step('Edit and save profile', async () => {
        await page.getByTestId('my-profile-firstname-input').fill('Rear Admiral Grace');
        await page.getByTestId('my-profile-contact-input').fill('5551234567');
        await think(page);
        await page.getByTestId('my-profile-update-button').click();
        await expect(page.getByRole('status').first()).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Security tab offers a password change', async () => {
        await page.getByTestId('my-profile-security-tab').click();
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
        await think(page);
        await page.getByTestId('my-profile-details-tab').click();
        await expect(page.getByTestId('my-profile-firstname-input')).toHaveValue('Rear Admiral Grace');
      });
    },
  },

  {
    title: 'logged-in shopper fills checkout address and payment',
    run: async ({ page }) => {
      const account = await signUpAndLogIn(page, { firstName: 'Linus', lastName: 'Torvalds' });

      await test.step('Add two products to the cart', async () => {
        for (const n of [1, 8]) {
          await page.getByTestId('header-menu-all-products').click();
          await expect(page.getByTestId('all-products-title')).toBeVisible({ timeout: 30_000 });
          await openNthProduct(page, n);
          await addCurrentProductToCart(page);
          await think(page);
        }
      });

      const cartTotal = await test.step('Go to checkout from the cart page', async () => {
        await openCartDrawer(page);
        await page.getByTestId('view-cart-button').click();
        const total = money(await page.getByTestId('cart-order-summary-total-value').innerText());
        await page.getByTestId('cart-checkout-button').click();
        await expect(page.getByTestId('checkout-title')).toBeVisible({ timeout: 30_000 });
        return total;
      });

      await test.step('Save a shipping address', async () => {
        const address = {
          'first-name': account.firstName,
          email: account.email,
          street: '1 Penguin Way',
          city: 'Portland',
          state: 'Oregon',
          'zip-code': '97201',
          country: 'United States',
        };
        for (const [field, value] of Object.entries(address)) {
          await page.getByTestId(`checkout-${field}-input`).fill(value);
        }
        await page.getByTestId('checkout-save-address-button').click();
        await expect(page.getByRole('status').filter({ hasText: 'Address added successfully' }).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('checkout-address-street')).toContainText('1 Penguin Way');
      });

      await test.step('Try each payment method', async () => {
        for (const method of ['credit-card', 'debit-card', 'netbanking', 'cod']) {
          await page.getByTestId(`checkout-${method}-button`).click();
          await think(page, 800);
        }
        await page.getByTestId('checkout-credit-card-button').click();
        await page.getByTestId('checkout-card-number-input').fill('4242424242424242');
        await page.getByTestId('checkout-cardholder-name-input').fill('Linus Torvalds');
        await page.getByTestId('checkout-cvv-input').fill('123');
      });

      await test.step('Order summary matches the cart', async () => {
        await expect(page.getByTestId('checkout-place-order-button')).toBeEnabled();
        expect(money(await page.getByTestId('checkout-total-value').innerText())).toBeCloseTo(cartTotal, 0);
      });
    },
  },
];
