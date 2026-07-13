{
  "name": "creature-forge",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@dimforge/rapier3d-compat": "^0.19.3",
    "three": "^0.185.1"
  },
  "devDependencies": {
    "@types/three": "^0.185.1",
    "typescript": "^5.8.3",
    "vite": "^6.4.1"
  }
}
