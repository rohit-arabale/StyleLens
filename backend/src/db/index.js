/**
 * Database barrel export.
 * Re-exports all database client initializers for clean imports.
 */
export { initializeFirebase, getDb, getApp } from "./firebase.js";
export { initializeStorage, getBucket, getStorage } from "./storage.js";
