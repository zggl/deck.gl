//
// A base render pass.
//
// Attribution: This class and the multipass system were inspired by
// the THREE.js EffectComposer and *Pass classes

import Pass from './pass';
import MaskModel from './mask-model';
import GL from '@luma.gl/constants';

export default class MaskPass extends Pass {
  constructor(gl, props = {}) {
    super(gl, Object.assign({id: 'mask-pass'}, props));
    this.contour = props.contour;
    this.model = this._getModel(gl);
  }

  render(params) {
    const gl = this.gl;

    this._renderPass(gl, params);
  }

  delete() {
    this.model.delete();
    this.model = null;
  }

  // Private method

  _getModel(gl) {
    const model = new MaskModel(gl, {contour: this.contour});
    return model;
  }

  _renderPass(gl, params) {
    const writeValue = 1;
    const clearValue = 0;

    // don't update color or depth
    gl.colorMask(false, false, false, false);
    gl.depthMask(false);

    // set up stencil
    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
    gl.stencilFunc(gl.ALWAYS, writeValue, 0xffffffff);
    gl.clearStencil(clearValue);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    this.model.setDrawMode(GL.TRIANGLE_FAN);
    this.model.draw();
    // TODO - draw into the stencil buffers of the two framebuffers
    // renderer.render(this.scene, this.camera, this.readBuffer, this.clear);
    // renderer.render(this.scene, this.camera, this.writeBuffer, this.clear);

    // re-enable update of color and depth
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    if (params.color[0] !== 0) {
      this.model.setDrawMode(GL.LINE_LOOP);
      this.model.draw({
        uniforms: {
          color: [10, 10, 10]
        },
        parameters: {
          depthWrite: true,
          depthTest: true
        }
      });
    } else {
      params.color[0] = params.color[1];
    }

    // only render where stencil is set to 1
    gl.stencilFunc(gl.EQUAL, 1, 0xffffffff); // draw if == 1
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    gl.enable(gl.STENCIL_TEST);
    this.model.setDrawMode(GL.TRIANGLE_FAN);
    this.model.draw({
      uniforms: {
        color: params.color
      },
      parameters: {
        depthWrite: false,
        depthTest: false
      }
    });
  }
}
