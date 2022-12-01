/*
Creator: Artur Brytkowski
https://www.fiverr.com/arturbrytkowski
*/

import {Scene} from './Scene.js';

//CREATING CONTAINER FOR SCENE
const container = document.createElement('div');
container.setAttribute('style', 'width: 100%; height: 100vh; margin: 0; padding: 0;')
document.body.appendChild(container);
// CREATING AND RENDERING REACT ELEMENT INSIDE CONTAINER
const scene = new Scene(container);