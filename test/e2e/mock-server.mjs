#!/usr/bin/env zx

/**
 * Mock server for testing crawl functionality
 */

import { createServer } from 'http';
import { parse } from 'url';
import { chalk } from 'zx';

const PORT = 3333;

// Mock pages data
const pages = {
  '/': `
    <html>
      <head><title>Test Home</title></head>
      <body>
        <h1>Test Website</h1>
        <a href="/products/1">Product 1</a>
        <a href="/products/2">Product 2</a>
        <a href="/category/electronics">Electronics</a>
        <a href="/category/books">Books</a>
        <a href="/blog/2024/01/test-post">Blog Post</a>
      </body>
    </html>
  `,
  '/products/1': `
    <html>
      <head><title>Product 1</title></head>
      <body>
        <h1>Product 1</h1>
        <img src="/images/product1.jpg">
        <script src="/js/product.js"></script>
        <link rel="stylesheet" href="/css/product.css">
      </body>
    </html>
  `,
  '/products/2': `
    <html>
      <head><title>Product 2</title></head>
      <body>
        <h1>Product 2</h1>
        <img src="/images/product2.jpg">
        <script src="/js/product.js"></script>
        <link rel="stylesheet" href="/css/product.css">
      </body>
    </html>
  `,
  '/category/electronics': `
    <html>
      <head><title>Electronics</title></head>
      <body>
        <h1>Electronics Category</h1>
        <div class="products">
          <a href="/products/1">Product 1</a>
          <a href="/products/3">Product 3</a>
        </div>
      </body>
    </html>
  `,
  '/category/books': `
    <html>
      <head><title>Books</title></head>
      <body>
        <h1>Books Category</h1>
        <div class="products">
          <a href="/products/4">Product 4</a>
          <a href="/products/5">Product 5</a>
        </div>
      </body>
    </html>
  `,
  '/blog/2024/01/test-post': `
    <html>
      <head><title>Test Blog Post</title></head>
      <body>
        <article>
          <h1>Test Blog Post</h1>
          <p>This is a test blog post.</p>
        </article>
      </body>
    </html>
  `,
  '/robots.txt': `
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /
  `,
};

// Create server
const server = createServer((req, res) => {
  const { pathname } = parse(req.url);

  console.log(chalk.gray(`  ${req.method} ${pathname}`));

  // Simulate some latency
  setTimeout(() => {
    if (pages[pathname]) {
      res.writeHead(200, {
        'Content-Type': pathname.endsWith('.txt') ? 'text/plain' : 'text/html',
      });
      res.end(pages[pathname]);
    } else if (
      pathname.startsWith('/images/') ||
      pathname.startsWith('/js/') ||
      pathname.startsWith('/css/')
    ) {
      // Simulate static assets
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('mock asset content');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>404 Not Found</h1></body></html>');
    }
  }, Math.random() * 100); // Random latency 0-100ms
});

// Start server
export function startMockServer() {
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(chalk.green(`🌐 Mock server running at http://localhost:${PORT}`));
      resolve(server);
    });
  });
}

// Stop server
export function stopMockServer() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log(chalk.yellow('🛑 Mock server stopped'));
      resolve();
    });
  });
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMockServer();

  // Keep server running
  process.on('SIGINT', async () => {
    await stopMockServer();
    process.exit(0);
  });
}
