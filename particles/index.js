/*jshint esversion: 6 */
'use strict';

// Implemented:
// density
// dist proportionate wall repulsion
// gravity
// 
// Questions:
// When to do dampening?
// How to deal w/settling
// Pressure! How to get gradient so we incorporate direction?

const NUM_SHAPES = 200;
const FOV = 45;
const NEAR = 0.01;
const FAR = 10;
const START_VELOCITY = 0.01;
const MAX_KERNAL_DIST = 1; // If this is < 1, it gets weird...
const C = 315.0 / (64 * Math.PI * Math.pow(MAX_KERNAL_DIST, 9));
const GRAVITY = 0.001;
const WALLS = [[1,0,0], [0,1,0], [0,0,1], [-1,0,0], [0,-1,0], [0,0,-1]];
const WALL_REPULSION = 0.0001;
const DAMPENING = 0.1;
const WALL_THRESH = 1; // Closeness to trigger wall repel
const PRESSURE_CONST = 1;
const REST_DENSITY = 0;

let DRAW_NORMALS = true;
let ROTATION_SPEED = 0.0;
let CAMERA_TRANSLATION = [0, 0, 1.5];
let CAMERA_LOOK = [0, 0, 0];
let PAUSE = false;
let CLEAR_COLOR = [0.9, 0.6, 0.0, 1.0];

let gl;
let canvas;
let lights;
let program;
let camera;
let objects = [];
let pMatrix = mat4.create();
let previousLoc = {
  x: 300,
  y: 250
};

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  for (var object of objects) {
    object.draw(gl, camera);
  }
}

function update() {
  camera.update();
  resetAttributes();
  computeDensities();
  calculateAccelerations();

  for (var object of objects) {
    object.update();
  }
}

function resetAttributes() {
  for (var i = 0; i < objects.length; i++) {
    objects[i].density = 0;
  }
}

function computeDensities() {
  for (var i = 0; i < objects.length; i++) {
    for (var j = 0; j < objects.length; j++) {
      let distance = vec3.distance(objects[j].position, objects[i].position);
      let densityContribution = densityKernel(distance, MAX_KERNAL_DIST);
      objects[i].density += densityContribution;
    }
  }
}

function calculateAccelerations() {
  for (var i = 0; i < objects.length; i++) {
    let acceleration = vec3.create();

    // Add Gravity
    acceleration[1] -= GRAVITY;

    // Wall Collisions
    for (var wall of WALLS) {
      let wall_vec = vec3.create();
      let wall_norm = vec3.create();
      let force = vec3.create();

      vec3.set(wall_vec, wall[0], wall[1], wall[2]);
      let dist = vec3.distance(objects[i].position, wall_vec);
      if (dist < WALL_THRESH) {
        vec3.scale(wall_norm, wall_vec, -1);

        // Set the force
        vec3.scale(force, wall_norm, WALL_REPULSION/dist);

        vec3.add(acceleration, acceleration, force);
        console.log(force)
      }
    }

    // Pressure
    for (var j = 0; j < objects.length; j++) {
      let p1 = PRESSURE_CONST * (objects[i].density - REST_DENSITY);
      let p2 = PRESSURE_CONST * (objects[j].density - REST_DENSITY);

      let distance = vec3.distance(objects[j].position, objects[i].position); // I'm computing this twice...

      let f_pressure = densityKernel(distance, MAX_KERNAL_DIST);
      // Left Off HERE...

    }
    
    // Set accelerations
    objects[i].acceleration = acceleration;
  }
}

function densityKernel(r, h) {
  if (r < 0 || r > h) {
    return 0;
  }

  return C * Math.pow((Math.pow(h, 2) - Math.pow(r, 2)), 3);  
}

function setupGeo(gl, shader) {
  for (let i = 0; i < NUM_SHAPES; i++) {
    // constructor(gl, shader, mass = 1, position = [0,0,0], velocity = [0,0,0], color = [0,0,0,0]) {

    let position = [randrange(-1, 1), randrange(-1, 1), 0]; 
    console.log(position);
    let velocity = [randrange(-START_VELOCITY, START_VELOCITY), randrange(-START_VELOCITY, START_VELOCITY), randrange(-START_VELOCITY, START_VELOCITY)]; 
    let p = new Particle(gl, shader, 1, position, velocity, [1,1,1,1]);
    objects.push(p);
  }
  console.log(objects);
}

function start() {
  // TODO: Remove extraneous stuff from this function
  console.log('Started up WebGL');
  canvas = $('#glCanvas')[0];

  gl = initWebGL(canvas);

  if (!gl) {
    return;
  }

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(CLEAR_COLOR[0], CLEAR_COLOR[1], CLEAR_COLOR[2], CLEAR_COLOR[3]);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Init some shaders
  const vertexShaderSource = $('#vertex-shader')[0].text;
  const fragmentShaderSource = $('#fragment-shader')[0].text;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  // Set the perspective matrix
  mat4.perspective(pMatrix, FOV, gl.canvas.width/gl.canvas.height, NEAR, FAR);
  const pMatrixLoc = gl.getUniformLocation(program, "u_pMatrix");
  gl.uniformMatrix4fv(pMatrixLoc, false, pMatrix);

  // Create the camera
  camera = new Camera(CAMERA_TRANSLATION, CAMERA_LOOK);

  
  setupHandlers();
  setupGeo(gl, program);

  // Draw it
  render();

  console.log('Finished');
}

function setupHandlers() {
  canvas.onmousemove = mouseHandler;
  canvas.onmousedown = handleMouseDown;
}

function handleMouseDown(event) {
  PAUSE = !PAUSE;
}

function randrange(min, max) {
  return min + (Math.random() * (max - min)); 
}

function render() {
  requestAnimFrame(render);
  if (!PAUSE) {
    update();
    draw();
  }
}

function initWebGL(canvas) {
  gl = null;
  gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    alert('No WebGL support found.');
  }
  return gl;
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    console.log('Compiled shader program');
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    console.log('Compiled shader ' + type);
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function mouseHandler(ev) {
  const scale = 0.01;
  let offsetX = (ev.clientX - canvas.width/2.0) / (canvas.width/2.0);
  let offsetY = (canvas.height/2.0 - ev.clientY) / (canvas.height/2.0);
  offsetX *= (Math.PI / 2);
  offsetY *= (Math.PI / 2);

  camera.position[0] = Math.sin(offsetX) * 3.0;
  camera.position[1] = Math.sin(offsetY) * 3.0;
  camera.position[2] = Math.cos(offsetX) * 3.0;
}