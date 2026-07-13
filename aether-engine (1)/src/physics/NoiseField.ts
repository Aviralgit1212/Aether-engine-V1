/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Improved Perlin Noise generator for organic, coherent fluid-like drift
class ImprovedNoise {
  private p: Int32Array;

  constructor() {
    this.p = new Int32Array(512);
    const permutation = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
      8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,
      117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168, 68,175,
      74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,
      220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,
      76,132,187,208, 89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,
      173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,
      207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,
      44,154,163, 70,221,153,101,155,167, 43,172,9,129,22,39,253, 19,98,108,110,
      79,113,224,232,178,185, 112,104,218,246,97,228,251,34,242,193,238,210,144,
      12,191,179,162,241, 81,51,145,235,28,93,223,184,239,121,180,45,215,205,114,
      50,107,140,84,181,201,192,204,120,4,142,222,221,137,236,122,141,19,207,177,
      131,211,133,180,55,110,94,156,81,146,41,59,24,66,130,194,57,48,193,209,21,
      63,115,220,22,233,124,198,40,166,183,161,244,188,96,245,61,65,3,105,102,
      200,145,14,144,242,118,45,204,185,202,230,227,159,191,100,114,246,125,182,
      235,16,129,27,169,111,181,255,215,170,12,112,103,165,117,152,241,179,164,
      234,138,136,151,113,229,192,62,38,155,153,167,42,189,83,158,236,248,64,15,
      208,44,218,172,37,134,119,101,116,210,211,109,251,154,162,148,84,228,107,
      32,197,240,219,225,190, 8,206,135,186,132,149,82,147,213,252,232,253,39,
      126,247,231,244,115,108,18,217,34,250,226,10,205,254,104,224,163,222,123,
      80,243,60,178,216,171,196,156,128,49,150,249,199,25,160,26,139,237,30,85,
      121,69,214,174,138,43,128,150,168,143,157,49,29,243,254,52,222,252,199,47
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[256 + i] = permutation[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }
}

const improvedNoise = new ImprovedNoise();

export function getNoise2D(x: number, y: number): number {
  return improvedNoise.noise(x, y, 0.5);
}

export function getNoise3D(x: number, y: number, z: number): number {
  return improvedNoise.noise(x, y, z);
}

// Generates a 2D vector of coherent noise for particle turbulence
export function getNoiseVector(x: number, y: number, z: number): [number, number] {
  // Use slightly offset coordinates to decouple X and Y noise values
  const nx = improvedNoise.noise(x, y, z);
  const ny = improvedNoise.noise(x + 11.5, y + 21.3, z + 3.14);
  return [nx, ny];
}
