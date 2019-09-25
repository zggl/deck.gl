import {createModuleInjection} from '@luma.gl/core';

const wboitModule = {
  name: 'wboit',
  fs: `
layout(location=1) out float wboit_alpha;

float weight1(float z, float a) {
  return a;
}

float weight2(float z, float a) {
  return clamp(pow(min(1.0, a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - z * 0.9, 3.0), 1e-2, 3e3);
}

float weight3(float z, float a) {
  return a * a * (1.0 - z * 0.9) * 10.0;
}
`
};

createModuleInjection('wboit', {
  hook: 'fs:DECKGL_FILTER_COLOR',
  injection: `
float w = weight3(gl_FragCoord.z, color.a);
float a = color.a * w;
color.rgb *= a;
wboit_alpha = a;
  `
});

export default wboitModule;
