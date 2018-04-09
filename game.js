var scene, camera, renderer;
var geometry, material, mesh;
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, .1, 1000 );
    camera.position.z = 5;
    geometry = new THREE.BoxGeometry( 1, 1, 1);
    material = new THREE.MeshBasicMaterial({
        color: 0x00ff00, wireframe: true
    });

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
    let floorgeometry = new THREE.BoxGeometry(100,0.1,100);
    let floormaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, wireframe: true
    });
    let floor = new THREE.Mesh(floorgeometry, floormaterial);
    floor.position.y = -1;
    scene.add(floor);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );
    renderer.domElement.addEventListener("click", makeFullscreen);

    document.addEventListener("mousemove", rotateCamera, false);
    document.addEventListener("keydown", moveUpdateKeydown, false);
    document.addEventListener("keyup", moveUpdateKeyup, false);
    if ("onpointerlockchange" in document) {
        document.addEventListener('pointerlockchange', lockChangeAlert, false);
    } else if ("onmozpointerlockchange" in document) {
        document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    }
    if ("onfullscreenchange" in document) {
        document.addEventListener('fullscreenchange', fullscreenChange, false);
    } else if ("onmozfullscreenchange" in document) {
        document.addEventListener('mozfullscreenchange', fullscreenChange, false);
    }

    animate();
}
function makeFullscreen() {
    let el = renderer.domElement;
    if(el.requestFullscreen) {
        el.requestFullscreen();
    }
    else if(el.webkitRequestFullScreen) {
        el.webkitRequestFullScreen();
    }
    else {
        el.mozRequestFullScreen();
    }
    el.requestPointerLock = el.requestPointerLock ||
        el.mozRequestPointerLock;

    el.requestPointerLock()

}

// We have to request the pointerlock after the fullscreen has finished.
// totally undocumented...
function fullscreenChange(e) {
    renderer.setSize( window.innerWidth, window.innerHeight );
    let el = renderer.domElement;
    if (!document.fullscreenElement) {
        el.requestPointerLock = el.requestPointerLock ||
            el.mozRequestPointerLock;

        el.requestPointerLock()
    } else {
        document.exitPointerLock = document.exitPointerLock    ||
            document.mozExitPointerLock;

        document.exitPointerLock();
    }
}

function lockChangeAlert() {
    let el = renderer.domElement;
    if(document.pointerLockElement === el ||
        document.mozPointerLockElement === el) {
        console.log('The pointer lock status is now locked');
    } else {
        console.log('The pointer lock status is now unlocked');      
    }
}

let currentMoveKey = {};
function moveUpdateKeydown(e) {
    console.log('down', e);
    currentMoveKey[e.key] = true;
}

function moveUpdateKeyup(e) {
    console.log('up', e);
    delete currentMoveKey[e.key];
}

function movementUpdate() {
    Object.keys(currentMoveKey).forEach(moveCamera);
}

function moveCamera(key) {
    var vector = new THREE.Vector3( 0, 0, - 1 );
    vector.applyQuaternion( camera.quaternion );
    vector.setY(0);
    vector.multiplyScalar(0.2);
    switch(key) {
        case 'w':
            camera.position.add(vector);
            break;
        case 's':
            camera.position.sub(vector);
            break;
        case 'a':
            vector.applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);
            camera.position.add(vector);
            break;
        case 'd':
            vector.applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);
            camera.position.sub(vector);
            break;
        default:
            break;
    }
}

// Track vertical mouse movement
let camera_tmp;
function rotateCamera(e) {
    let moveX = -e.movementY / 20;

    let world_mat = new THREE.Matrix4();
    let axis = new THREE.Vector3(0,1,0);
    world_mat.makeRotationAxis(axis.normalize(), -e.movementX/100);
    world_mat.multiply(camera.matrix);
    camera.matrix = world_mat;
    camera.rotation.setFromRotationMatrix(camera.matrix);

    camera.rotateX(moveX);

    // Axes to rotate about
    let x = new THREE.Vector3();
    let y = new THREE.Vector3();
    let z = new THREE.Vector3();
    camera.matrix.extractBasis(x,y,z);
    let real_y = new THREE.Vector3(0,1,0);
    let angle =  real_y.dot(y);
    console.log(angle);
    if (angle < 0) {
        camera.matrx = camera_tmp;
        camera.rotation.setFromRotationMatrix(camera_tmp);
    } else {
        camera_tmp = camera.matrix.clone();
    }
}

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    movementUpdate();
}

window.addEventListener('load', init);

