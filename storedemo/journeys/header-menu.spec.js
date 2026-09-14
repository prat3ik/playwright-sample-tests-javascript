// @ts-check
import { test } from '../support.js';
import { journey } from '../journeys.js';

const { title, details, run } = journey('header-menu');

test(title, details, run);
