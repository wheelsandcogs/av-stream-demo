import { Internal } from 'pechkin/dist/types.js';

// Extend Express Request interface to include 'files'
declare module 'express-serve-static-core' {
  interface Request {
    files?: Internal.Files;
  }
}
