import GL from '@luma.gl/constants';
import {
  ProgramManager,
  Model,
  Framebuffer,
  Texture2D,
  Buffer,
  withParameters,
  clear
} from '@luma.gl/core';
import {PostProcessEffect} from '@deck.gl/core';

import wboitModule from './wboit-shader-module';

// TODO: make effect system more generic
export default class WBOITEffect extends PostProcessEffect {
  constructor(props) {
    super(wboitModule, props);
  }

  prepare(gl, params) {
    if (!this.resources) {
      this.resources = createResources(gl, params);
    }
    if (!this.programManager) {
      this.programManager = ProgramManager.getDefaultProgramManager(gl);
      this.programManager.addDefaultModule(wboitModule);
    }
    const {accumulationFramebuffer} = this.resources;

    accumulationFramebuffer.resize({
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight
    });

    return {
      parameters: {
        blendFunc: [GL.ONE, GL.ONE, GL.ZERO, GL.ONE_MINUS_SRC_ALPHA],
        blend: true,
        depthMask: false,
        clearColor: [0, 0, 0, 1],
        clearDepth: 1,
        cull: false,
        framebuffer: this.resources.accumulationFramebuffer
      }
    };
  }

  render(params) {
    const {oitModel} = this.resources;
    const {gl} = oitModel;

    withParameters(
      gl,
      {
        blendFunc: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
        blend: true,
        depthTest: false,
        framebuffer: params.target || params.outputBuffer
      },
      () => {
        clear(gl, {color: true});
        this.resources.oitModel.draw();
      }
    );
    return params;
  }

  cleanup() {
    if (this.resources) {
      const {
        accumulationTexture,
        accumulationDepthTexture,
        revealageTexture,
        accumulationFramebuffer
      } = this.resources;

      accumulationFramebuffer.delete();
      accumulationTexture.delete();
      accumulationDepthTexture.delete();
      revealageTexture.delete();

      this.resources = null;
    }
    if (this.programManager) {
      this.programManager.removeDefaultModule(wboitModule);
      this.programManager = null;
    }
  }
}

const oitBlendVs = `\
#version 300 es
in vec4 positions;

void main() {
    gl_Position = positions;
}
`;

const oitBlendFs = `\
#version 300 es
precision highp float;
uniform sampler2D uAccumulate;
uniform sampler2D uAccumulateAlpha;
out vec4 fragColor;

void main() {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 accum = texelFetch(uAccumulate, fragCoord, 0);
    float a = 1.0 - accum.a;
    accum.a = texelFetch(uAccumulateAlpha, fragCoord, 0).r;
    // fragColor = vec4(a * accum.rgb / clamp(accum.a, 0.001, 100.0), a);
    fragColor = vec4(accum.rgb, a);
}
`;

function createResources(gl) {
  const textureOpts = {
    type: gl.FLOAT,
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    mipmaps: false,
    parameters: {
      [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
      [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
      [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
      [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
    }
  };

  const accumulationTexture = new Texture2D(gl, {
    ...textureOpts,
    format: gl.RGBA32F
  });

  const revealageTexture = new Texture2D(gl, {
    ...textureOpts,
    format: gl.R32F
  });

  const accumulationDepthTexture = new Texture2D(gl, {
    ...textureOpts,
    format: GL.DEPTH_COMPONENT32F,
    dataFormat: GL.DEPTH_COMPONENT
  });

  const accumulationFramebuffer = new Framebuffer(gl, {
    id: 'accumulation',
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    attachments: {
      [GL.COLOR_ATTACHMENT0]: accumulationTexture,
      [GL.COLOR_ATTACHMENT1]: revealageTexture,
      [GL.DEPTH_ATTACHMENT]: accumulationDepthTexture
    }
  });

  // TODO - using the default program manager would add the default shader modules to this model
  const programManager = new ProgramManager(gl);
  const oitModel = new Model(gl, {
    vs: oitBlendVs,
    fs: oitBlendFs,
    programManager,
    drawMode: GL.TRIANGLE_STRIP,
    attributes: {
      positions: [new Buffer(gl, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1])), {size: 2}]
    },
    vertexCount: 4,
    uniforms: {
      uAccumulate: accumulationTexture,
      uAccumulateAlpha: revealageTexture
    }
  });

  return {
    accumulationTexture,
    accumulationDepthTexture,
    revealageTexture,
    accumulationFramebuffer,
    oitModel
  };
}
