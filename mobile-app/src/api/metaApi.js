// PREVIEW VERSION. Stage 8 calls GET /meta/options, which needs no login.
import { delay } from './delay';
import { sampleOptions } from './sampleData';

export async function getOptions() {
  await delay(150);
  return sampleOptions;
}
