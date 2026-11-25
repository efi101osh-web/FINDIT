// PREVIEW VERSION (Stage 7). Stage 8 calls GET /meta/options, which has no login requirement.
import { delay } from './delay';
import { sampleOptions } from './sampleData';

export async function getOptions() {
  await delay(150);
  return sampleOptions;
}
