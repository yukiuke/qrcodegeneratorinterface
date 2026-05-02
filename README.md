# QR Code Generator

Small single-page app built with **React**, **Vite**, and the [`qrcode`](https://github.com/soldair/node-qrcode) package (`npm install qrcode`). All encoding runs in the browser; there is no separate QR backend.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Edit [`src/App.jsx`](src/App.jsx) to change behavior or layout.

## Production build

```bash
npm run build
```

Static assets are written to `dist/`. Preview that output locally:

```bash
npm run preview
```

## Deploy

Upload the contents of `dist/` to any static host (GitHub Pages, S3, Netlify, etc.). The app is fully client-side; no server runtime is required for QR generation.
