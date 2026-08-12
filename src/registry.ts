import type { Case } from './types';
import blockingFibonacci from './cases/blocking-fibonacci';

// Add new antipattern cases here. Sidebar and routing read from this array.
export const cases: Case[] = [blockingFibonacci];
