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
#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader-side
#define IS_SIDE_VERTEX

////////////////////////////
// PROJECT 32
////////////////////////////

uniform vec3 project_uCommonUnitsPerWorldUnit;
uniform vec3 project_uCommonUnitsPerWorldUnit2;
uniform vec4 project_uCenter;
uniform mat4 project_uViewProjectionMatrix;
uniform vec3 project_uCoordinateOrigin;

vec4 project_offset_(vec4 offset) {
  float dy = offset.y;
  vec3 commonUnitsPerWorldUnit = project_uCommonUnitsPerWorldUnit + project_uCommonUnitsPerWorldUnit2 * dy;
  return vec4(offset.xyz * commonUnitsPerWorldUnit, offset.w);
}

//
// Projects lnglats (or meter offsets, depending on mode) to common space
//
vec4 project_position(vec4 position, vec3 position64Low) {  
  return project_offset_(vec4(position.xyz - project_uCoordinateOrigin + position64Low, position.w));
}

vec3 project_position(vec3 position, vec3 position64Low) {
  vec4 projected_position = project_position(vec4(position, 1.0), position64Low);
  return projected_position.xyz;
}

vec4 project_common_position_to_clipspace(vec4 position, mat4 viewProjectionMatrix, vec4 center) {
  return viewProjectionMatrix * position + center;
}

//
// Projects from common space coordinates to clip space.
// Uses project_uViewProjectionMatrix
//
vec4 project_common_position_to_clipspace(vec4 position) {
  return project_common_position_to_clipspace(position, project_uViewProjectionMatrix, project_uCenter);
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

layout(location=0) in vec3 instancePositions;
layout(location=1) in vec3 instancePositions64Low;
layout(location=2) in vec3 nextPositions;
layout(location=3) in vec3 nextPositions64Low;
layout(location=4) in float instanceElevations;
layout(location=5) in vec4 instanceLineColors;

layout(location=6) in vec2 vertexPositions;
layout(location=7) in float vertexValid;

uniform float elevationScale;
uniform float opacity;

out vec4 vColor;

void main(void) {
  vec3 pos;
  vec3 pos64Low;
  vec4 colors = instanceLineColors;

  pos = mix(instancePositions, nextPositions, vertexPositions.x);
  pos64Low = mix(instancePositions64Low, nextPositions64Low, vertexPositions.x);

  pos.z += instanceElevations * vertexPositions.y * elevationScale;

  gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.));

  vColor = vec4(colors.rgb, colors.a * opacity);
}
`;
