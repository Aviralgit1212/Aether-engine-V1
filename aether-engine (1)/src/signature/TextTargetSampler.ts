/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from "../core/Config";

/**
 * Utility to rasterize a string to an offscreen canvas and sample target coordinates.
 */
export class TextTargetSampler {
  /**
   * Generates exactly `count` points representing the text glyphs, centered in [0, 1] space.
   */
  public sampleTextPoints(text: string, count: number): Float32Array {
    const points = new Float32Array(count * 2);

    // 1. Create an offscreen canvas
    const canvas = document.createElement("canvas");
    const width = 1024;
    const height = 256;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // Fallback: simple elegant ellipse if WebGL/Canvas context fails
      console.warn("Could not get 2D context for text rasterization, falling back to procedural circle.");
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        points[i * 2] = 0.5 + Math.cos(theta) * 0.25;
        points[i * 2 + 1] = 0.5 + Math.sin(theta) * 0.12;
      }
      return points;
    }

    // 2. Clear canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // 3. Draw white text using high-contrast typography
    // Prefer Outfit, Space Grotesk, Inter or standard sans-serif
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 130px 'Space Grotesk', 'Inter', 'Outfit', 'Montserrat', sans-serif";
    ctx.fillText(text, width / 2, height / 2 + 10); // slightly offset downwards

    // 4. Retrieve pixel data
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 5. Gather all active white pixel coordinates
    const whitePixels: { x: number; y: number }[] = [];
    const step = 2; // pixel scanning resolution step (skip pixels for speed)
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const r = data[index];
        // If bright pixel, capture coordinate
        if (r > 150) {
          whitePixels.push({ x, y });
        }
      }
    }

    // If no white pixels detected (e.g. font failed/blank), create fallback
    if (whitePixels.length === 0) {
      console.warn("No pixels rendered for text, falling back to circular shape.");
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        points[i * 2] = 0.5 + Math.cos(theta) * 0.25;
        points[i * 2 + 1] = 0.5 + Math.sin(theta) * 0.12;
      }
      return points;
    }

    // 6. Resample captured pixels to exactly `count` points
    // Center alignment and aspect ratio scaling:
    // Determine min/max bounding box of the text pixels to normalize and center it
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let i = 0; i < whitePixels.length; i++) {
      const p = whitePixels[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const textW = maxX - minX;
    const textH = maxY - minY;

    // Shuffling index array to distribute particles randomly across the word rather than left-to-right
    const indices = Array.from({ length: whitePixels.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    // Generate coordinates mapped to [0, 1] range, centered vertically & horizontally
    // Standard target layout size: width is 0.7 (from 0.15 to 0.85)
    const targetWidth = 0.65;
    const targetScale = targetWidth / textW;

    for (let i = 0; i < count; i++) {
      // Pick a pixel from our shuffled list, wrapping around if count > whitePixels length
      const pixelIdx = indices[i % whitePixels.length];
      const px = whitePixels[pixelIdx];

      // Translate coordinate to center, scale it, and offset to screen center (0.5)
      // Standardize aspect ratio to preserve typography
      const screenX = 0.5 + (px.x - (minX + textW / 2)) * targetScale;
      // We invert Y if drawing in WebGL coordinate space, but since we draw 2D with standard top-to-bottom
      // or bottom-to-top we should ensure it matches our shader coordinate space.
      // WebGL standard: y=0 is bottom, y=1 is top.
      // Canvas standard: y=0 is top, y=1 is bottom.
      // We will INVERT the Y axis from canvas space so that in WebGL it renders right side up.
      const screenY = 0.5 - (px.y - (minY + textH / 2)) * targetScale;

      points[i * 2] = screenX;
      // Add a tiny bit of random spread to avoid perfect pixel stacking
      points[i * 2 + 1] = screenY;
    }

    return points;
  }
}
export default TextTargetSampler;
