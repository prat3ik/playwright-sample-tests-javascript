// @ts-check
import { test } from '../support.js';
import { journey } from '../journeys.js';

const { title, details, run } = journey('wishlist');

test(title, details, run);
