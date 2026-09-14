// @ts-check
import { test } from '../support.js';
import { journey } from '../journeys.js';

const { title, details, run } = journey('cart-quantity');

test(title, details, run);
