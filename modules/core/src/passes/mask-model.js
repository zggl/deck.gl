import GL from '@luma.gl/constants';
import {Model, Geometry} from '@luma.gl/core';

const MASK_VERTEX_SHADER = `\
attribute vec2 aClipSpacePosition;

void main(void) {
  gl_Position = vec4(aClipSpacePosition, 0., 1.);
}
`;

const MASK_FS_SHADER = `\
uniform vec3 color;

void main() {
  gl_FragColor = vec4(color/255.0, 1.0);
}
`;

export default class MaskModel extends Model {
  constructor(gl, opts) {
    const {contour = []} = opts;
    const positions = [];

    for (const point of contour) {
      positions.push(point[0] * 2.0 - 1.0);
      positions.push(point[1] * 2.0 - 1.0);
    }

    super(
      gl,
      Object.assign({}, opts, {
        vs: MASK_VERTEX_SHADER,
        fs: MASK_FS_SHADER,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_FAN,
          vertexCount: positions.length / 2,
          attributes: {
            aClipSpacePosition: {size: 2, value: new Float32Array(positions)}
          }
        })
      })
    );
    this.setVertexCount(positions.length / 2);
  }
}
