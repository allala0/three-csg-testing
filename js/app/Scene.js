/*
Creator: Artur Brytkowski
https://www.fiverr.com/arturbrytkowski
*/

import * as THREE from 'three'

import {GLTFLoader} from '../lib/three.js-master/examples/jsm/loaders/GLTFLoader.js'
import {OBJLoader} from '../lib/three.js-master/examples/jsm/loaders/OBJLoader.js'
import {STLLoader} from '../lib/three.js-master/examples/jsm/loaders/STLLoader.js'
import {FBXLoader} from '../lib/three.js-master/examples/jsm/loaders/FBXLoader.js'

import {OrbitControls} from '../lib/three.js-master/examples/jsm/controls/OrbitControls.js'
import {TrackballControls} from '../lib/three.js-master/examples/jsm/controls/TrackballControls.js'

import Stats from '../lib/three.js-master/examples/jsm/libs/stats.module.js'
import {GUI} from '../lib/three.js-master/examples/jsm/libs/lil-gui.module.min.js'

import CSG from "../lib/THREE-CSGMesh/three-csg.js";

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

THREE.Mesh.prototype.move = function(x=0, y=0, z=0){
    if(x.isVector3) this.position.copy(x);
    else{
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }
    this.updateMatrix();
}

class Scene{
    constructor(mount){   
        this.mount = mount;
        
        this.animation_queue = [];
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(1, 1);
        this.raycaster = new THREE.Raycaster();
        this.scene = new THREE.Scene();

        this.add_renderer();
        this.add_camera();
        this.add_event_listeners();    
        this.add_loaders();

        this.add_lights();
        this.add_models();

        this.add_controls();
        this.add_stats();
        this.add_gui();

        this.GameLoop();
    }
    
    add_loaders(){
        this.texture_loader = new THREE.TextureLoader();
        this.file_loader = new THREE.FileLoader();

        this.gltf_loader = new GLTFLoader();
        this.obj_loader = new OBJLoader();
        this.stl_loader = new STLLoader();
        this.fbx_loader = new FBXLoader();
    }
    
    add_renderer(color=0x131313){
        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.enabled = true;
        this.renderer.setSize(this.mount.offsetWidth, this.mount.offsetHeight);
        this.renderer.setClearColor(color);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.mount.appendChild(this.renderer.domElement);
    }

    add_camera(type=0, params=[]){
        if(type === 0){
            this.add_perspective_camera(...params);
        }
        else if(type === 1){
            this.add_ortographic_camera(...params);
        }
    }

    add_perspective_camera(x=27, y=27, z=27, fov=45){
        this.camera = new THREE.PerspectiveCamera(fov, this.mount.offsetWidth / this.mount.offsetHeight, 0.1, 10000);
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.position.z = z;
        this.camera.lookAt(0, 0, 0);
        this.is_perspective_camera = true;
        this.is_ortographic_camera = false;
    }
    
    add_ortographic_camera(x=1, y=1, z=1, camera_width=1.5, max_camera_ratio=1.5){
        this.base_camera_width = camera_width;
        this.camera_width = camera_width;
        this.camera_height = camera_width;
        
        this.max_camera_ratio = max_camera_ratio;
        
        this.camera_ratio = ((this.mount.offsetWidth) / (this.mount.offsetHeight));
        
        if(this.camera_ratio < this.max_camera_ratio){this.camera_height /= this.camera_ratio}
        else{this.camera_width *= this.camera_ratio / this.camera_ratio; this.camera_height /= this.camera_ratio;}
        
        this.camera = new THREE.OrthographicCamera( this.camera_width / - 2, this.camera_width / 2, this.camera_height / 2, this.camera_height / - 2, -1000, 1000 );
        
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.position.z = z;
        this.camera.lookAt(0, 0, 0);
        this.is_ortographic_camera = true;
        this.is_perspective_camera = false;
    }
    
    add_controls(type=0, params=[]){
        if(type === 0){
            this.add_orbit_controls(...params);
        }
        else if(type === 1){
            this.add_trackball_controls(...params);
        }
    }

    add_trackball_controls(){
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        this.controls.rotateSpeed = 3.5;
        this.controls.panSpeed = 0.2;
        this.controls.dynamicDampingFactor = 0.1;
    }
    
    add_orbit_controls(){
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
    }    
    
    add_stats(){
        this.stats = new Stats();
        this.stats.showPanel(0);
        this.mount.appendChild(this.stats.dom);
    }
    
    add_gui(){
        this.gui = new GUI();
        const geometry_folder = this.gui.addFolder('Geometry');
        geometry_folder.open();
        // const rotation_folder = geometry_folder.addFolder('Rotation')
        // rotation_folder.add(this.mesh.rotation, 'x', 0, Math.PI * 2).name('rotation x');
        // this.gui.addColor(this.mesh.material, 'color');
        // this.gui.add(this.mesh.material, 'wireframe')
        // this.gui.add(this, 'infinine_animation')
        // this.gui.add(this, 'multiple_animations')
        this.gui.add(this, 'width').min(1).max(10)
        this.gui.add(this, 'height').min(1).max(5)
        this.gui.add(this, 'depth').min(1).max(10)
        this.gui.add(this, 'resetMesh')
        this.gui.add(this, 'rectangle').listen()
        this.gui.add(this, 'cylinder').listen()
        this.gui.add(this, 'sphere').listen()
    }

    set rectangle(val){
        this.shape = 'rectangle';
    }

    get rectangle(){
        return this.shape === 'rectangle'
    }

    set cylinder(val){
        this.shape = 'cylinder';
    }

    get cylinder(){
        return this.shape === 'cylinder'
    }

    set sphere(val){
        this.shape = 'sphere';
    }

    get sphere(){
        return this.shape === 'sphere'
    }

    resetMesh(){
        const rootMesh = this.fills.children[0];
        this.subtractions.clear();
        this.fills.childern  = [rootMesh];
        this.updateMesh();
    }

    get_geometry_volume(geometry) {
        if (!geometry.isBufferGeometry) {
          console.warn("'geometry' must be an indexed or non-indexed buffer geometry");
          return 0;
        }
        var isIndexed = geometry.index !== null;
        let position = geometry.attributes.position;
        let sum = 0;
        let p1 = new THREE.Vector3(),
          p2 = new THREE.Vector3(),
          p3 = new THREE.Vector3();
        if (!isIndexed) {
          let faces = position.count / 3;
          for (let i = 0; i < faces; i++) {
            p1.fromBufferAttribute(position, i * 3 + 0);
            p2.fromBufferAttribute(position, i * 3 + 1);
            p3.fromBufferAttribute(position, i * 3 + 2);
            sum += signedVolumeOfTriangle(p1, p2, p3);
          }
        }
        else {
          let index = geometry.index;
          let faces = index.count / 3;
          for (let i = 0; i < faces; i++){
            p1.fromBufferAttribute(position, index.array[i * 3 + 0]);
            p2.fromBufferAttribute(position, index.array[i * 3 + 1]);
            p3.fromBufferAttribute(position, index.array[i * 3 + 2]);
            sum += signedVolumeOfTriangle(p1, p2, p3);
          }
        }
        return sum;
      }

      doCSG(a,b,op,mat){
        let bspA = CSG.fromMesh( a );
        let bspB = CSG.fromMesh( b );
        let bspC = bspA[op]( bspB );
        let result = CSG.toMesh( bspC, a.matrix );
        result.material = mat;
        result.castShadow  = result.receiveShadow = true;
        return result;
    }

    add_models(){

        this.shape = 'rectangle';

        this.width = 5;
        this.height = 5;
        this.depth = 5;

        const material = new THREE.MeshStandardMaterial();

        this.fills = new THREE.Group();
        this.subtractions = new THREE.Group();
        this.fills.children = [
            new Fill(new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), material))
        ];
        this.subtractions.children = [
            // new Fill(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), material), new THREE.Vector3(5, 5, 5)),
            // new Fill(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), material), new THREE.Vector3(-5, 5, -5))
            // new Subtraction(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 5, 64, 64), material), new THREE.Vector3(5, 5, 5)),
            // new Subtraction(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 5, 64, 64), material), new THREE.Vector3(-5, 4, -5))
        ];
        
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);

        this.updateMesh();

        this.scene.add(this.mesh);

    }

    addSubtraction(mesh, position){
        this.subtractions.add(new Subtraction(mesh, position));
        this.updateMesh();
    }

    addFill(mesh, position){
        this.fills.add(new Fill(mesh, position));
        this.updateMesh();
    }

    updateMesh(){
        const material = new THREE.MeshStandardMaterial();
        let mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        
        let counter = 0;

        for(const fill of this.fills.children){
            if(counter++ === 0) mesh = fill;
            else mesh = this.doCSG(mesh, fill, 'union', material);
        }

        for(const subtraction of this.subtractions.children){
            if(counter++ !== 0) mesh = this.doCSG(mesh, subtraction, 'subtract', material);
        }

        this.mesh.removeFromParent();        
        this.mesh = mesh;
        this.scene.add(this.mesh);
    }

    infinine_animation(){
        const animation1 = this.create_animation(this.mesh, 'rotation', new THREE.Vector3(Math.PI / 2, 0, 0), 0.1);
        const animation2 = this.create_animation(this.mesh, 'rotation', new THREE.Vector3(0, Math.PI / 2, 0), 0.1);
        const animation3 = this.create_animation(this.mesh, 'rotation', new THREE.Vector3(0, 0, Math.PI / 2), 0.1);
        animation1.callback = () => {this.mesh.rotation.x = 0;this.add_animation(animation2)};
        animation2.callback = () => {this.mesh.rotation.y = 0;this.add_animation(animation3)};
        animation3.callback = () => {this.mesh.rotation.z = 0;this.add_animation(animation1)};
        this.add_animation(animation1);

        const animation4 = this.create_animation(this.mesh.material, 'color', new THREE.Color(1, 0, 0), 0.05);
        const animation5 = this.create_animation(this.mesh.material, 'color', new THREE.Color(0, 1, 0), 0.05);
        const animation6 = this.create_animation(this.mesh.material, 'color', new THREE.Color(0, 0, 1), 0.05);
        animation4.callback = () => {this.add_animation(animation5)};
        animation5.callback = () => {this.add_animation(animation6)};
        animation6.callback = () => {this.add_animation(animation4)};
        this.add_animation(animation4);
    }

    multiple_animations(){
        const step = 0.1;
        this.add_animation(this.create_animation(this.mesh, 'position', new THREE.Vector3(0, 0.25, 0), step));
        this.add_animation(this.create_animation(this.mesh, 'rotation', new THREE.Euler(Math.PI / 2, Math.PI / 2, Math.PI / 2), step));
        this.add_animation(this.create_animation(this.mesh, 'scale', new THREE.Vector3(2, 2, 2), step));
        this.add_animation(this.create_animation(this.mesh.material, 'color', new THREE.Color(1, 0, 0), step));
        this.add_animation(this.create_animation(this.mesh.material, 'opacity', 0.6, step));
    }
    
    reset_animations(){
        const step = 0.1;
        this.add_animation(this.create_animation(this.mesh, 'position', new THREE.Vector3(0, 0, 0), step));
        this.add_animation(this.create_animation(this.mesh, 'rotation', new THREE.Euler(0, 0, 0), step));
        this.add_animation(this.create_animation(this.mesh, 'scale', new THREE.Vector3(1, 1, 1), step));
        this.add_animation(this.create_animation(this.mesh.material, 'color', new THREE.Color(1, 1, 1), step));
        this.add_animation(this.create_animation(this.mesh.material, 'opacity', 1, step));
    }

    GameLoop(){
        if(this.stats){this.stats.begin()}
        requestAnimationFrame(() => this.GameLoop());
        this.render();
        this.update();
        if(this.stats){this.stats.end()}
    }
    
    update(){ 
        this.hover();
        // this.animate();
        this.resize();
        if(this.controls){this.controls.update()}
        // console.log(this.renderer.info.render.triangles);
    }
    
    update_loaded(){

    }

    render(){
        this.renderer.render(this.scene, this.camera);
    }    
    
    add_lights(){
        this.lights_group = new THREE.Group();
        var power = 0.2;
        var power2 = 0.4;
        var power3 = 0.7;
        var color = 0xffffff;
        var distance = 100;
        
        var lights_properties = [[distance, distance, distance, power, false], [-distance, distance, -distance, power2, false], [-distance, distance, distance, power3, true], [distance, distance, -distance, power2, false]];

        for(var i=0; i < lights_properties.length; i++){
            var light = new THREE.DirectionalLight(color, lights_properties[i][3], 500);
            
            var light_size = 100;
            
            // light.castShadow = true;

            light.shadow.camera.left = -light_size;
            light.shadow.camera.right = light_size;
            light.shadow.camera.top = light_size;
            light.shadow.camera.bottom = -light_size;
            light.shadow.mapSize.width = 10000;
            light.shadow.mapSize.height = 10000;

            light.position.set(lights_properties[i][0], lights_properties[i][1], lights_properties[i][2]);
            if(lights_properties[i][4]){light.castShadow = true;}
         
            this.lights_group.add(light);
        }
     
        this.lights_group.add(new THREE.AmbientLight(0xffffff, 0.2));
        this.scene.add(this.lights_group);
        
        return this.lights_group;
    }
    
    add_event_listeners(){
        
        window.addEventListener('resize', () => {
            this.resize();
        });
        
        this.mount.addEventListener('mousemove', (event) => {
            this.mouse_move(event);
        });

        this.mount.addEventListener('mousedown', (event) => {
            this.mouse_down(event);
        });
        
        this.mount.addEventListener('mouseup', (event) => {
            this.mouse_up(event);
        });
        
        this.mount.addEventListener("contextmenu", e => e.preventDefault());
    }
    
    mouse_move(event){
        this.mouse_last = {...this.mouse}

        this.mouse.x = ((event.clientX + window.scrollX - this.mount.parentNode.offsetLeft) / this.mount.offsetWidth) * 2 - 1;
        this.mouse.y = - ((event.clientY + window.scrollY - this.mount.parentNode.offsetTop) / this.mount.offsetHeight) * 2 + 1;
    }
    
    resize(){
        if(this.is_perspective_camera){
            var width = this.mount.offsetWidth;
            var height = this.mount.offsetHeight;
            this.renderer.setSize(width, height);
            this.camera.aspect = width/height;
            this.camera.updateProjectionMatrix();
        }
        else if(this.is_ortographic_camera){
            var width = this.mount.offsetWidth;
            var height = this.mount.offsetHeight;
            this.renderer.setSize(width, height);
            this.camera.aspect = width/height;
            this.camera.updateProjectionMatrix();
            
            this.camera_width = this.base_camera_width;
            this.camera_height = this.base_camera_width;
            
            this.camera_ratio = (this.mount.offsetWidth / this.mount.offsetHeight);
        
            if(this.camera_ratio < this.max_camera_ratio){this.camera_height /= this.camera_ratio;}
            else{this.camera_width *= this.camera_ratio;}

            this.camera.left = -this.camera_width / 2;
            this.camera.right = this.camera_width / 2;
            this.camera.top = this.camera_height / 2;
            this.camera.bottom = -this.camera_height / 2;
        }
    }
    
    move_v3_to_v3(from, to, amount){
        const v_rel = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
        const new_v = new THREE.Vector3(from.x + v_rel.x * amount, from.y + v_rel.y * amount, from.z + v_rel.z * amount)
        return new_v;
    }

    move_v2_to_v2(from, to, amount){
        const v_rel = new THREE.Vector2(to.x - from.x, to.y - from.y);
        const new_v = new THREE.Vector2(from.x + v_rel.x * amount, from.y + v_rel.y * amount)
        return new_v;
    }

    move_num_to_num(from, to, amount){
        const num_rel = to - from;
        const new_num = from + num_rel * amount;
        return new_num;
    }

    is_hovered(object){
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if(object.isMesh) return this.raycaster.intersectObject(object).length > 0;
        if(object.isGroup) return this.raycaster.intersectObjects(object.children).length > 0;
        return false;
    }

    mouse_up(event){
        if(this.controls) this.controls.enabled = true;
    }
    
    mouse_down(event){
        if(this.is_hovered(this.mesh)) if(this.controls) this.controls.enabled = false;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectsSegments = this.raycaster.intersectObject(this.mesh);
        const intersection = intersectsSegments[0];
        if(intersection){
            const position = intersection.point;
            const geometry = this.shape === 'rectangle' ? new THREE.BoxGeometry(this.width, this.height, this.depth) : this.shape === 'cylinder' ? new THREE.CylinderGeometry(this.width, this.width, this.height, 32) : new THREE.SphereGeometry(this.width, 32, 32);
            this.addSubtraction(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()), position);

        }
        
        // if(this.is_hovered(this.segments)) if(this.controls) this.controls.enabled = false;
        // this.raycaster.setFromCamera(this.mouse, this.camera);
        // const intersectsSegments = this.raycaster.intersectObject(this.segments);
        // if(intersectsSegments[0]){
        //     const face = intersectsSegments[0].object;
        //     const segment = face.parent;
        //     if(event.button == 0){
        //         this.addSegmentByFace(face);
        //     }
        //     else if(event.button == 2){
        //         this.removeSegment(segment);
        //     }
        // }
    }

    addSegmentByFace(face){
        const segment = face.parent;
        const newSegment = new Segment(segment.position.clone());
        newSegment.position.z += face.orientation === 0 ? 1 * segment.size.z : face.orientation === 1 ? -1 * segment.size.z : 0;
        newSegment.position.x += face.orientation === 2 ? 1 * segment.size.x : face.orientation === 3 ? -1 * segment.size.x : 0;
        newSegment.position.y += face.orientation === 4 ? 1 * segment.size.y : face.orientation === 5 ? -1 * segment.size.y : 0;
        this.segments.add(newSegment);
    }

    removeSegment(segment){
        segment.removeFromParent();
    }

    hover(){
        // if(this.is_hovered(this.segments)){
        //     document.body.style.cursor ='pointer'
        // }
        // else{
        //     document.body.style.cursor = 'default';
        // }
    }

    create_animation(object, property, end_state, speed=0.1, callback=null){
        const animation_config = {object: object, property: property, end_state: end_state, speed: speed, callback: callback, ended: false}
        return animation_config;
    }

    add_animation(animation_config){
        animation_config.ended = false;
        for(const [index, animation] of this.animation_queue.entries()){
            if(animation.object == animation_config.object && animation.property === animation_config.property){
                this.animation_queue[index] = animation_config;
                return;
            }
        }
        this.animation_queue.push(animation_config);
    }

    animate(){
        for(const [index, animation] of [...this.animation_queue].reverse().entries()){
            const object = animation.object;
            if(animation.ended) continue;
            if(object[animation.property].isVector3){
                const last_vec3 = object[animation.property].clone();
                object[animation.property].copy(this.move_v3_to_v3(object[animation.property], animation.end_state, animation.speed));
                if(object[animation.property].distanceTo(last_vec3) < 0.001){
                    object[animation.property].clone(animation.end_state);
                    this.animation_queue[this.animation_queue.length - index - 1].ended = true;
                }
            }
            if(object[animation.property].isVector2){
                const last_vec2 = object[animation.property].clone();
                object[animation.property].copy(this.move_v2_to_v2(object[animation.property], animation.end_state, animation.speed));
                if(object[animation.property].distanceTo(last_vec2) < 0.001){
                    object[animation.property].clone(animation.end_state);
                    this.animation_queue[this.animation_queue.length - index - 1].ended = true;
                }
            }
            else if(object[animation.property].isEuler){
                const end_state_vec3 = new THREE.Vector3(animation.end_state.x, animation.end_state.y, animation.end_state.z);
                const last_euler = object[animation.property].clone();
                const last_vec3 = new THREE.Vector3(last_euler.x, last_euler.y, last_euler.z);
                const new_vec3 = this.move_v3_to_v3(last_vec3, end_state_vec3, animation.speed);
                const new_euler = new THREE.Euler(new_vec3.x, new_vec3.y, new_vec3.z, last_euler.order);
                object[animation.property].copy(new_euler);
                if(new_vec3.distanceTo(last_vec3) < 0.001){
                    object[animation.property].clone(animation.end_state);
                    this.animation_queue[this.animation_queue.length - index - 1].ended = true;
                }
            }
            else if(object[animation.property].isColor){
                const end_state_vec3 = new THREE.Vector3(animation.end_state.r, animation.end_state.g, animation.end_state.b);
                const last_color = object[animation.property].clone();
                const last_vec3 = new THREE.Vector3(last_color.r, last_color.g, last_color.b);
                const new_vec3 = this.move_v3_to_v3(last_vec3, end_state_vec3, animation.speed);
                const new_color = new THREE.Color(new_vec3.x, new_vec3.y, new_vec3.z);
                object[animation.property].copy(new_color);
                if(new_vec3.distanceTo(last_vec3) < 0.001){
                    object[animation.property].clone(animation.end_state);
                    this.animation_queue[this.animation_queue.length - index - 1].ended = true;
                }
            }
            else if(!isNaN(object[animation.property])){
                const last_num = object[animation.property];
                object[animation.property] = this.move_num_to_num(object[animation.property], animation.end_state, animation.speed);
                if(Math.abs(object[animation.property] - last_num) < 0.001){
                    object[animation.property] = animation.end_state;
                    this.animation_queue[this.animation_queue.length - index - 1].ended = true;
                }
            }
            if(this.animation_queue[this.animation_queue.length - index - 1].ended && this.animation_queue[this.animation_queue.length - index - 1].callback){
                this.animation_queue[this.animation_queue.length - index - 1].callback()
            }
        }

        for(var i=0; i < this.animation_queue.length; i++){
            if(this.animation_queue[i].ended){
                this.animation_queue.splice(i--, 1);
            }
        }
    }
}

class Segment extends THREE.Mesh{
    constructor(mesh, position=new THREE.Vector3()){
        super(mesh.geometry.clone(), mesh.material.clone());
        this.move(position);
    }
}

class Fill extends Segment{
    constructor(mesh, position=new THREE.Vector3()){
        super(mesh, position);
        this.isFill = true;
    }
}

class Subtraction extends Segment{
    constructor(mesh, position=new THREE.Vector3()){
        super(mesh, position);
        this.isSubtraction = true;
    }
}

// class Segment extends THREE.Group{
//     constructor(position=new THREE.Vector3(), size=new THREE.Vector3(1, 1, 1), rotation=new THREE.Euler()){
//         super();

//         this.size = size;

//         for(var orientation=0; orientation < 6; orientation++){
//             const face = new Face(size, orientation);
//             this.add(face);
//         }
        
//         this.position.copy(position);
//         this.rotation.copy(rotation);    
//     }
// }

// class Face extends THREE.Mesh{
//     constructor(size=new THREE.Vector3(), orientation=0){
        
//         const material = new THREE.MeshStandardMaterial();
        
//         const positions = [
//             new THREE.Vector3(0, 0, 0.5 * size.z), 
//             new THREE.Vector3(0, 0, -0.5 * size.z),
//             new THREE.Vector3(0.5 * size.x, 0, 0), 
//             new THREE.Vector3(-0.5 * size.x, 0, 0),
//             new THREE.Vector3(0, 0.5 * size.y, 0), 
//             new THREE.Vector3(0, -0.5 * size.y, 0),
//         ];

//         const sizes = [
//             new THREE.Vector2(size.x, size.y),
//             new THREE.Vector2(size.x, size.y),
//             new THREE.Vector2(size.z, size.y),
//             new THREE.Vector2(size.z, size.y),
//             new THREE.Vector2(size.x, size.z),
//             new THREE.Vector2(size.x, size.z),
//         ];

//         const rotations = [
//             new THREE.Euler(0, 0, 0),
//             new THREE.Euler(0, Math.PI, 0),
//             new THREE.Euler(0, Math.PI / 2, 0),
//             new THREE.Euler(0, -Math.PI / 2, 0),
//             new THREE.Euler(-Math.PI / 2, 0, 0),
//             new THREE.Euler(Math.PI / 2, 0, 0),
//         ];

//         const plane = new THREE.PlaneGeometry(sizes[orientation].x, sizes[orientation].y);
//         super(plane, material.clone());

//         this.position.copy(positions[orientation]);
//         this.rotation.copy(rotations[orientation]);

//         this.orientation = orientation;

//         // this.castShadow = true;
//         // this.receiveShadow = true;
//     }
// }

class Grid extends THREE.GridHelper{
    constructor(size=10, divisions=10, y=0){
        super(size, divisions);
        this.position.y = y;
    }
}

export {Scene}