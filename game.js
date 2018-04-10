var scene, camera, renderer;
var geometry, material, mesh;
var socket;

let g_id;

class Player {

    constructor() {
        this.image = document.createElement( 'img' );
        this.box = new THREE.BoxGeometry( 1, 1, 1);
        let texture = new THREE.Texture(this.image);
        let other_material = new THREE.MeshBasicMaterial({
            color: 0x00ff00
        });
        this.material = new THREE.MeshBasicMaterial({
            side: THREE.FrontSide, map: texture
        });
        this.object = new THREE.Mesh(this.box, [
            other_material,
            other_material,
            other_material,
            other_material,
            this.material,
            other_material,
        ]
        );
        scene.add(this.object);
        this.realPos = new THREE.Vector3();
        this.realRot = new THREE.Vector3();
    }

    update(position, rotation, image) {
        this.realPos.x = position.x;
        this.realPos.y = position.y;
        this.realPos.z = position.z;

        this.realRot.x = rotation.x;
        this.realRot.y = rotation.y;
        this.realRot.z = rotation.z;

        this.image.src = image;
        this.material.needsUpdate = true;
        this.material.map.needsUpdate = true;
    }

    animate() {
        let objPos = new THREE.Vector3(
            this.object.position.x,
            this.object.position.y,
            this.object.position.z
        );
        let posDiff = objPos.sub(this.realPos).multiplyScalar(0.5);

        this.object.position.x -= posDiff.x;
        this.object.position.y -= posDiff.y;
        this.object.position.z -= posDiff.z;
        this.object.lookAt(this.realRot);
    }

    kill() {
        scene.remove(this.object.name);
    }
}


let playerMap = {}
let sendLock = false;
function init_websockets() {
    socket = new WebSocket('ws://'+window.location.hostname+':8080');

    socket.onopen = function (e) {
    };

    socket.onerror = function (e) {
        console.log(e);
    };

    socket.onmessage = function (e) {
        let i = e.data.indexOf("--");
        let id = Number.parseInt(e.data.slice(0, i));
        let json_str = e.data.slice(i + 2);
        // This means we are new
        if (json_str.length == 0) {
            g_id = id;
            return;
        }

        let data = JSON.parse(json_str);
        // We received our packet back
        if (id == g_id) { 
            sendLock = false;
            return;
        }

        if (data.position && data.rotation && data.image) {
            if (!playerMap[id]) {
                playerMap[id] = new Player();
            }
            playerMap[id].update(data.position, data.rotation, data.image);
        }
        if (data.delete) {
            playerMap[id].kill();
            delete playerMap[id];
        }
    };
}

function init() {
    initWebcam();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, .1, 1000 );
    camera.position.z = 5;
    geometry = new THREE.BoxGeometry( 1, 1, 1);
    let video = document.getElementById('video');
    //let texture = new THREE.VideoTexture(video);
    //texture.minFilter = THREE.LinearFilter;
    //texture.magFilter = THREE.LinearFilter;
    //texture.format = THREE.RGBFormat;
    //let canvas = document.getElementById('canvas');
    //let texture = new THREE.Texture(canvas);
    //material = new THREE.MeshBasicMaterial({ map: texture });
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
    init_websockets();
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
    camera.setSize( window.innerWidth, window.innerHeight );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.domElement.width = window.innerWidth;
    renderer.domElement.height = window.innerHeight;
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
    currentMoveKey[e.key] = true;
}

function moveUpdateKeyup(e) {
    delete currentMoveKey[e.key];
}

function movementUpdate() {
    Object.keys(currentMoveKey).forEach(moveCamera);
}

function broadcastPosition() {
    if (sendLock) { return; }
    sendLock = true;
    let rotation = new THREE.Vector3();
    var pLocal = new THREE.Vector3(0, 0, -1);
    var pWorld = pLocal.applyMatrix4(camera.matrixWorld);
    updateWebcamCanvas();
    let canvas = document.getElementById('canvas');
    let dataURL = canvas.toDataURL();

    let data = {
        position : camera.position,
        rotation : pWorld,
        image: dataURL
    };
    socket.send(JSON.stringify(data));
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
    broadcastPosition();
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
    if (angle < 0) {
        camera.matrx = camera_tmp;
        camera.rotation.setFromRotationMatrix(camera_tmp);
    } else {
        camera_tmp = camera.matrix.clone();
    }
    broadcastPosition();
}

function animate() {
    requestAnimationFrame( animate );
    Object.keys(playerMap).forEach(function (key) {
        playerMap[key].animate();
    });
    renderer.render( scene, camera );
    movementUpdate();
}

function initWebcam() {
  let video = document.getElementById('video');
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occured! " + err);
    });
}

function updateWebcamCanvas() {
  let video = document.getElementById('video');
  let canvas = document.getElementById('canvas');
  let context = canvas.getContext('2d');
  let w = canvas.width;
  let h = canvas.height;
  context.drawImage(video,0,0,w,h);
}

window.addEventListener('load', init);

