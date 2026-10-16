import core from './core';
import text from './text';
import fs from './fs';
import sys from './sys';
import { Registry } from '../registry';

export function defaultRegistry(): Registry {
  return new Registry().add(...core, ...text, ...fs, ...sys);
}
