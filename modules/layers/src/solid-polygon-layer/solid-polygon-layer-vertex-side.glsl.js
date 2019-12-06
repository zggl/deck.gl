// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import main from './solid-polygon-layer-vertex-main.glsl';

export default `\
#define SHADER_NAME solid-polygon-layer-vertex-shader-side
#define IS_SIDE_VERTEX

////////////////////////////
// PROJECT 32
////////////////////////////

#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND

// All these functions are for substituting tan() function from Intel GPU only
const float TWO_PI = 6.2831854820251465;
const float PI_2 = 1.5707963705062866;
const float PI_16 = 0.1963495463132858;

const float SIN_TABLE_0 = 0.19509032368659973;
const float SIN_TABLE_1 = 0.3826834261417389;
const float SIN_TABLE_2 = 0.5555702447891235;
const float SIN_TABLE_3 = 0.7071067690849304;

const float COS_TABLE_0 = 0.9807852506637573;
const float COS_TABLE_1 = 0.9238795042037964;
const float COS_TABLE_2 = 0.8314695954322815;
const float COS_TABLE_3 = 0.7071067690849304;

const float INVERSE_FACTORIAL_3 = 1.666666716337204e-01; // 1/3!
const float INVERSE_FACTORIAL_5 = 8.333333767950535e-03; // 1/5!
const float INVERSE_FACTORIAL_7 = 1.9841270113829523e-04; // 1/7!
const float INVERSE_FACTORIAL_9 = 2.75573188446287533e-06; // 1/9!

float sin_taylor_fp32(float a) {
  float r, s, t, x;

  if (a == 0.0) {
    return 0.0;
  }

  x = -a * a;
  s = a;
  r = a;

  r = r * x;
  t = r * INVERSE_FACTORIAL_3;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_5;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_7;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_9;
  s = s + t;

  return s;
}

void sincos_taylor_fp32(float a, out float sin_t, out float cos_t) {
  if (a == 0.0) {
    sin_t = 0.0;
    cos_t = 1.0;
  }
  sin_t = sin_taylor_fp32(a);
  cos_t = sqrt(1.0 - sin_t * sin_t);
}

float tan_taylor_fp32(float a) {
    float sin_a;
    float cos_a;

    if (a == 0.0) {
        return 0.0;
    }

    // 2pi range reduction
    float z = floor(a / TWO_PI);
    float r = a - TWO_PI * z;

    float t;
    float q = floor(r / PI_2 + 0.5);
    int j = int(q);

    if (j < -2 || j > 2) {
        return 0.0 / 0.0;
    }

    t = r - PI_2 * q;

    q = floor(t / PI_16 + 0.5);
    int k = int(q);
    int abs_k = int(abs(float(k)));

    if (abs_k > 4) {
        return 0.0 / 0.0;
    } else {
        t = t - PI_16 * q;
    }

    float u = 0.0;
    float v = 0.0;

    float sin_t, cos_t;
    float s, c;
    sincos_taylor_fp32(t, sin_t, cos_t);

    if (k == 0) {
        s = sin_t;
        c = cos_t;
    } else {
        if (abs(float(abs_k) - 1.0) < 0.5) {
            u = COS_TABLE_0;
            v = SIN_TABLE_0;
        } else if (abs(float(abs_k) - 2.0) < 0.5) {
            u = COS_TABLE_1;
            v = SIN_TABLE_1;
        } else if (abs(float(abs_k) - 3.0) < 0.5) {
            u = COS_TABLE_2;
            v = SIN_TABLE_2;
        } else if (abs(float(abs_k) - 4.0) < 0.5) {
            u = COS_TABLE_3;
            v = SIN_TABLE_3;
        }
        if (k > 0) {
            s = u * sin_t + v * cos_t;
            c = u * cos_t - v * sin_t;
        } else {
            s = u * sin_t - v * cos_t;
            c = u * cos_t + v * sin_t;
        }
    }

    if (j == 0) {
        sin_a = s;
        cos_a = c;
    } else if (j == 1) {
        sin_a = c;
        cos_a = -s;
    } else if (j == -1) {
        sin_a = -c;
        cos_a = s;
    } else {
        sin_a = -s;
        cos_a = -c;
    }
    return sin_a / cos_a;
}
#endif

float tan_fp32(float a) {
#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND
  return tan_taylor_fp32(a);
#else
  return tan(a);
#endif
}

#define COORDINATE_SYSTEM_LNG_LAT 1.0
#define COORDINATE_SYSTEM_LNGLAT_AUTO_OFFSET 4.0
#define COORDINATE_SYSTEM_METER_OFFSETS 2.0
#define COORDINATE_SYSTEM_LNGLAT_OFFSETS 3.0
#define COORDINATE_SYSTEM_IDENTITY 0.0

uniform float project_uCoordinateSystem;
uniform float project_uScale;
uniform bool project_uWrapLongitude;
uniform float project_uAntimeridian;
uniform vec3 project_uCommonUnitsPerMeter;
uniform vec3 project_uCommonUnitsPerWorldUnit;
uniform vec3 project_uCommonUnitsPerWorldUnit2;
uniform vec4 project_uCenter;
uniform mat4 project_uModelMatrix;
uniform mat4 project_uViewProjectionMatrix;
uniform vec2 project_uViewportSize;
uniform float project_uDevicePixelRatio;
uniform float project_uFocalDistance;
uniform vec3 project_uCameraPosition;
uniform vec3 project_uCoordinateOrigin;

const float TILE_SIZE = 512.0;
const float PI = 3.1415926536;
const float WORLD_SCALE = TILE_SIZE / (PI * 2.0);
const vec3 ZERO_64_LOW = vec3(0.0);

//
// Scaling offsets - scales meters to "world distance"
// Note the scalar version of project_size is for scaling the z component only
//
float project_size(float meters) {
  return meters * project_uCommonUnitsPerMeter.z;
}

vec2 project_size(vec2 meters) {
  return meters * project_uCommonUnitsPerMeter.xy;
}

vec3 project_size(vec3 meters) {
  return meters * project_uCommonUnitsPerMeter;
}

vec4 project_size(vec4 meters) {
  return vec4(meters.xyz * project_uCommonUnitsPerMeter, meters.w);
}

//
// Projecting normal - transform deltas from current coordinate system to
// normals in the worldspace
//
vec3 project_normal(vec3 vector) {
  // Apply model matrix
  vec4 normal_modelspace = project_uModelMatrix * vec4(vector, 0.0);
  return normalize(normal_modelspace.xyz * project_uCommonUnitsPerMeter);
}

vec4 project_offset_(vec4 offset) {
  float dy = offset.y;
  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT_AUTO_OFFSET) {
    dy = clamp(dy, -1., 1.);
  }
  vec3 commonUnitsPerWorldUnit = project_uCommonUnitsPerWorldUnit + project_uCommonUnitsPerWorldUnit2 * dy;
  return vec4(offset.xyz * commonUnitsPerWorldUnit, offset.w);
}

//
// Projecting positions - non-linear projection: lnglats => unit tile [0-1, 0-1]
//
vec2 project_mercator_(vec2 lnglat) {
  float x = lnglat.x;
  if (project_uWrapLongitude) {
    x = mod(x - project_uAntimeridian, 360.0) + project_uAntimeridian;
  }
  return vec2(
    radians(x) + PI,
    PI + log(tan_fp32(PI * 0.25 + radians(lnglat.y) * 0.5))
  );
}

//
// Projects lnglats (or meter offsets, depending on mode) to common space
//
vec4 project_position(vec4 position, vec3 position64Low) {
  // TODO - why not simply subtract center and fall through?
  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNG_LAT) {
    return project_uModelMatrix * vec4(
      project_mercator_(position.xy) * WORLD_SCALE,
      project_size(position.z),
      position.w
    );
  }

  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT_AUTO_OFFSET) {
    // Subtract high part of 64 bit value. Convert remainder to float32, preserving precision.
    return project_offset_(vec4(position.xyz - project_uCoordinateOrigin + position64Low, position.w));
  }

  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
    return project_offset_(position);
  }

  // METER_OFFSETS or IDENTITY
  // Apply model matrix
  vec4 position_world = project_uModelMatrix * position;
  if (project_uCoordinateSystem == COORDINATE_SYSTEM_IDENTITY) {
    position_world.xyz -= project_uCoordinateOrigin;
    // Translation is already added to the high parts
    position_world += project_uModelMatrix * vec4(position64Low, 0.0);
  }

  return project_offset_(position_world);
}

vec4 project_position(vec4 position) {
  return project_position(position, ZERO_64_LOW);
}

vec3 project_position(vec3 position, vec3 position64Low) {
  vec4 projected_position = project_position(vec4(position, 1.0), position64Low);
  return projected_position.xyz;
}

vec3 project_position(vec3 position) {
  vec4 projected_position = project_position(vec4(position, 1.0), ZERO_64_LOW);
  return projected_position.xyz;
}

vec2 project_position(vec2 position) {
  vec4 projected_position = project_position(vec4(position, 0.0, 1.0), ZERO_64_LOW);
  return projected_position.xy;
}

vec4 project_common_position_to_clipspace(vec4 position, mat4 viewProjectionMatrix, vec4 center) {
  if (project_uCoordinateSystem == COORDINATE_SYSTEM_METER_OFFSETS ||
    project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
    // Needs to be divided with project_uCommonUnitsPerMeter
    position.w *= project_uCommonUnitsPerMeter.z;
  }
  return viewProjectionMatrix * position + center;
}

//
// Projects from common space coordinates to clip space.
// Uses project_uViewProjectionMatrix
//
vec4 project_common_position_to_clipspace(vec4 position) {
  return project_common_position_to_clipspace(position, project_uViewProjectionMatrix, project_uCenter);
}

// Returns a clip space offset that corresponds to a given number of screen pixels
vec2 project_pixel_size_to_clipspace(vec2 pixels) {
  vec2 offset = pixels / project_uViewportSize * project_uDevicePixelRatio * 2.0;
  return offset * project_uFocalDistance;
}

float project_size_to_pixel(float meters) {
  return project_size(meters) * project_uScale;
}
float project_pixel_size(float pixels) {
  return pixels / project_uScale;
}
vec2 project_pixel_size(vec2 pixels) {
  return pixels / project_uScale;
}

vec4 project_position_to_clipspace(
  vec3 position, vec3 position64Low, vec3 offset, out vec4 commonPosition
) {
  vec3 projectedPosition = project_position(position, position64Low);
  commonPosition = vec4(projectedPosition + offset, 1.0);
  return project_common_position_to_clipspace(commonPosition);
}

vec4 project_position_to_clipspace(
  vec3 position, vec3 position64Low, vec3 offset
) {
  vec4 commonPosition;
  return project_position_to_clipspace(position, position64Low, offset, commonPosition);
}

////////////////////////////
// END PROJECT 32
////////////////////////////

attribute vec3 instancePositions;
attribute vec3 instancePositions64Low;
attribute vec3 nextPositions;
attribute vec3 nextPositions64Low;
attribute float instanceElevations;
attribute vec4 instanceFillColors;
attribute vec4 instanceLineColors;
attribute vec3 instancePickingColors;

attribute vec2 vertexPositions;
attribute float vertexValid;

uniform bool extruded;
uniform bool isWireframe;
uniform float elevationScale;
uniform float opacity;

varying vec4 vColor;
varying float isValid;

struct PolygonProps {
  vec4 fillColors;
  vec4 lineColors;
  vec3 positions;
  vec3 nextPositions;
  vec3 pickingColors;
  vec3 positions64Low;
  vec3 nextPositions64Low;
  float elevations;
};

void calculatePosition(PolygonProps props) {
  vec3 pos;
  vec3 pos64Low;
  vec4 colors = isWireframe ? props.lineColors : props.fillColors;

#ifdef IS_SIDE_VERTEX
  pos = mix(props.positions, props.nextPositions, vertexPositions.x);
  pos64Low = mix(props.positions64Low, props.nextPositions64Low, vertexPositions.x);
  isValid = vertexValid;
#else
  pos = props.positions;
  pos64Low = props.positions64Low;
  isValid = 1.0;
#endif

  if (extruded) {
    pos.z += props.elevations * vertexPositions.y * elevationScale;
  }

  gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.));


  vColor = vec4(colors.rgb, colors.a * opacity);
}

void main(void) {
  PolygonProps props;

  props.positions = instancePositions;
  props.positions64Low = instancePositions64Low;
  props.elevations = instanceElevations;
  props.fillColors = instanceFillColors;
  props.lineColors = instanceLineColors;
  props.pickingColors = instancePickingColors;
  props.nextPositions = nextPositions;
  props.nextPositions64Low = nextPositions64Low;

  calculatePosition(props);
}
`;
