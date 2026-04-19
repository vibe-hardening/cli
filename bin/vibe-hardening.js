#!/usr/bin/env node
import { main } from '../dist/cli.js';

main(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
