/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders in GLSL ES 3.00 for Particles
const VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_position;
in vec4 a_color;
in float a_size;

out vec4 v_color;

void main() {
  // Convert normalized [0, 1] screen coordinates to clip space [-1, 1]
  // Standard WebGL clip space: y=1 is top, y=-1 is bottom
  float clipX = a_position.x * 2.0 - 1.0;
  float clipY = a_position.y * 2.0 - 1.0;
  
  gl_Position = vec4(clipX, clipY, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 outColor;

void main() {
  // Convert square point sprite to soft, glowing circle
  vec2 coord = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(coord);
  
  if (dist > 0.5) {
    discard;
  }
  
  // Custom soft-glow attenuation: quadratic falloff towards edge
  float intensity = 1.0 - (dist * 2.0); // 1 at center, 0 at border
  float glow = intensity * intensity;
  
  // Blend with color
  outColor = vec4(v_color.rgb, v_color.a * glow);
}
`;

// Shaders in GLSL ES 3.00 for Video Background rendering
const BG_VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_quad_position;
out vec2 v_tex_coord;

void main() {
  // Convert [-1, 1] quad position to texture coordinates [0, 1]
  // Mirror horizontally so the video matches intuitive mirror interaction
  v_tex_coord = vec2(0.5 - a_quad_position.x * 0.5, a_quad_position.y * 0.5 + 0.5);
  gl_Position = vec4(a_quad_position, 0.99, 1.0); // Close to the far clip plane
}
`;

const BG_FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;
uniform sampler2D u_video_texture;
in vec2 v_tex_coord;
out vec4 outColor;

void main() {
  vec4 texColor = texture(u_video_texture, v_tex_coord);
  // Dim the background webcam video to ~22% intensity so the golden particles stand out beautifully
  outColor = vec4(texColor.rgb * 0.22, 1.0);
}
`;

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  
  // WebGL Buffers for particles
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  private sizeBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  // Shader Attribute Locations for particles
  private posLoc: number = -1;
  private colorLoc: number = -1;
  private sizeLoc: number = -1;

  // WebGL Background Video Resources
  private bgProgram: WebGLProgram | null = null;
  private bgQuadBuffer: WebGLBuffer | null = null;
  private bgVao: WebGLVertexArrayObject | null = null;
  private bgQuadLoc: number = -1;
  private videoTexture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    
    if (!gl) {
      throw new Error("WebGL2 not supported on this device. Unable to initialize custom graphics renderer.");
    }
    this.gl = gl;
    this.initShaders();
    this.initBuffers();
  }

  private initShaders() {
    const gl = this.gl;

    // Helper to compile individual shader
    const compileShader = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create shader object.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation error: ${log}`);
      }
      return shader;
    };

    // 1. Create and compile Particle Program
    console.log("[WebGLRenderer] Compiling particle shader programs...");
    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create WebGL Program.");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    // Get Attribute Locations
    this.posLoc = gl.getAttribLocation(program, "a_position");
    this.colorLoc = gl.getAttribLocation(program, "a_color");
    this.sizeLoc = gl.getAttribLocation(program, "a_size");

    // 2. Create and compile Background Video Program
    console.log("[WebGLRenderer] Compiling background video shader programs...");
    const bgVs = compileShader(gl.VERTEX_SHADER, BG_VERTEX_SHADER_SRC);
    const bgFs = compileShader(gl.FRAGMENT_SHADER, BG_FRAGMENT_SHADER_SRC);

    const bgProgram = gl.createProgram();
    if (!bgProgram) throw new Error("Unable to create background WebGL Program.");
    gl.attachShader(bgProgram, bgVs);
    gl.attachShader(bgProgram, bgFs);
    gl.linkProgram(bgProgram);

    if (!gl.getProgramParameter(bgProgram, gl.LINK_STATUS)) {
      throw new Error(`Background program link error: ${gl.getProgramInfoLog(bgProgram)}`);
    }
    this.bgProgram = bgProgram;
    this.bgQuadLoc = gl.getAttribLocation(bgProgram, "a_quad_position");
  }

  private initBuffers() {
    const gl = this.gl;

    // --- Particle Buffers ---
    this.positionBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer();

    // Create Vertex Array Object (VAO) to store vertex layout state
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Bind Position Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind Color Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.enableVertexAttribArray(this.colorLoc);
    gl.vertexAttribPointer(this.colorLoc, 4, gl.FLOAT, false, 0, 0);

    // Bind Size Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.enableVertexAttribArray(this.sizeLoc);
    gl.vertexAttribPointer(this.sizeLoc, 1, gl.FLOAT, false, 0, 0);

    // --- Background Video Buffers & Texture ---
    console.log("[WebGLRenderer] Initializing quad buffers and background texture...");
    this.bgQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgQuadBuffer);
    
    // 2 triangles forming a full-screen quad [-1, 1]
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    this.bgVao = gl.createVertexArray();
    gl.bindVertexArray(this.bgVao);
    gl.enableVertexAttribArray(this.bgQuadLoc);
    gl.vertexAttribPointer(this.bgQuadLoc, 2, gl.FLOAT, false, 0, 0);

    // Create and configure video texture
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Clean up bindings
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Resizes viewport when canvas is scaled.
   */
  public resize() {
    const gl = this.gl;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Draws background camera feed and overlay particles.
   */
  public render(
    positions: Float32Array,
    colors: Float32Array,
    sizes: Float32Array,
    count: number,
    videoElement: HTMLVideoElement | null = null
  ) {
    const gl = this.gl;

    // 1. Set background and reset viewport
    this.resize();
    
    // Clear buffer (Luxury deep charcoal transparent/black background)
    gl.clearColor(0.02, 0.02, 0.025, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 2. Draw Background Video if available and ready
    if (videoElement && videoElement.readyState >= 2 && this.bgProgram && this.bgVao && this.videoTexture) {
      gl.disable(gl.BLEND); // Background doesn't need blend
      gl.disable(gl.DEPTH_TEST);

      gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
      // Upload current video frame to GPU texture
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

      gl.useProgram(this.bgProgram);
      gl.bindVertexArray(this.bgVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // 3. Enable additive blending for glowing nebula effects
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // standard additive glow
    gl.disable(gl.DEPTH_TEST);

    // 4. Upload CPU data to GPU dynamic buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);

    // 5. Bind program and VAO
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // 6. Draw points
    gl.drawArrays(gl.POINTS, 0, count);

    // 7. Cleanup bindings
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  /**
   * Destroy GL context resources on unmount
   */
  public destroy() {
    const gl = this.gl;
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer);
    if (this.sizeBuffer) gl.deleteBuffer(this.sizeBuffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);

    if (this.bgProgram) gl.deleteProgram(this.bgProgram);
    if (this.bgQuadBuffer) gl.deleteBuffer(this.bgQuadBuffer);
    if (this.bgVao) gl.deleteVertexArray(this.bgVao);
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
  }
}
export default WebGLRenderer;
