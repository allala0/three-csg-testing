/*
Creator: Artur Brytkowski
https://www.fiverr.com/arturbrytkowski
*/

import * as THREE from 'three'

const VS = `
varying vec2 vUv;
void main(){
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position.x, position.y, position.z, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const FS = `
varying vec2 vUv;
uniform sampler2D uTexture;

void main(){
    vec4 pixel = texture2D(uTexture, vUv);
    gl_FragColor = pixel;
}
`;

class ClassBlueprint{
    constructor(){
        
    }
}

export {ClassBlueprint};