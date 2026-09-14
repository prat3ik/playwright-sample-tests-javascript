// @ts-check
import { test } from '../support.js';
import { journey } from '../journeys.js';

const { title, details, run } = journey('related-products');

test(title, details, run);
