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

const NUM_PARTICLES = 700;
const SCALE = 1;
const FOV = 45;
const NEAR = 0.01;
const FAR = 200;
const MAX_KERNAL_DIST = 1.5; // If this is < 1, it gets weird...
const C = 315.0 / (64 * Math.PI * Math.pow(MAX_KERNAL_DIST, 9)); // DENSITY
const C2 = (45/(Math.PI * Math.pow(MAX_KERNAL_DIST, 6))); // VISCOSITY
const C3 = (-45/(Math.PI * Math.pow(MAX_KERNAL_DIST,6))) // PRESSURE
const GRAVITY = 600; // 100
const DAMPENING = 0.6; // was 0.6 Energy lost to wall repel
const REST_DENSITY = 100;
const NORMALIZE_DENSITY = 1;
const THREE_D = 0;
let MASS = 1;
const PRESSURE_CONSTANT = 20; // was 1.0
const MU = 80; // Basically springiness
const WALL_DIST = 13;
const SPACING = 1.0
const TIME_STEP = 0.08;

let DRAW_NORMALS = true;
let ROTATION_SPEED = 0.0;
let CAMERA_TRANSLATION = [0, 0, 5];
let CAMERA_LOOK = [0, 0, 0];
let PAUSE = false;
let CLEAR_COLOR = [1.0, 1.0, 1.0, 1.0, 1.0];

let gl;
let dt = 1;
let lastTime = Date.now();
let canvas;
let textCtx;
let lights;
let program;
let camera;
let objects = [];
let lines = [];
let pMatrix = mat4.create();
let sMatrix = mat4.create();

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  textCtx.clearRect(0, 0, textCtx.canvas.width, textCtx.canvas.height);
  textCtx.fillText(`${1/dt} FPS`, 20 , 10);
  
  for (var object of objects) {
    object.draw(gl, camera);
  }

  for (var line of lines) {
    line.draw(gl, camera);
  }
}

function update() {
  let currTime = Date.now() / 1000;
  dt = currTime - lastTime;
  lastTime = currTime;

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
    vec3.set(objects[i].acceleration, 0, 0, 0);
  }
}

function computeDensities() {
  // TODO: symetricize this
  for (var i = 0; i < objects.length; i++) {
    for (var j = i; j < objects.length; j++) {
      // if (i == j){ continue;} // QUESTION: Why does not computing self density lead to instability?

      let distance = vec3.distance(objects[j].position, objects[i].position);
       // Is this right?
      if (distance <= MAX_KERNAL_DIST) {
        let densityContribution = MASS * densityKernel(distance, MAX_KERNAL_DIST);
        objects[i].density += densityContribution;
        objects[j].density += densityContribution;
      }
    }
  }
}

function normalizeDensity() {
  computeDensities();

  const density_sum = objects.reduce((acc, val) => {
    return acc + val.density;
  }, 0);

  const density_sum_sq = objects.reduce((acc, val) => {
    return acc + (val.density * val.density);
  }, 0);

  MASS = (REST_DENSITY * density_sum)/density_sum_sq;
}

function calculateAccelerations() {
  let dir = vec3.create();
  let viscosity = vec3.create();
  let v_diff = vec3.create();
  let acceleration = vec3.create();

  for (var i = 0; i < objects.length; i++) {
    vec3.set(acceleration, 0,0,0);

    // Add Gravity
    objects[i].acceleration[1] -= GRAVITY;

    // Pressure
    for (var j = i + 1; j < objects.length; j++) {
      vec3.set(dir, 0, 0, 0);
      vec3.set(viscosity, 0, 0, 0);
      vec3.set(v_diff, 0, 0, 0);

      vec3.sub(dir, objects[i].position, objects[j].position);
      let r = vec3.length(dir);

      // Compute pressure
      if (r <= MAX_KERNAL_DIST) {
        let PRESSURE_I = PRESSURE_CONSTANT * (objects[i].density - REST_DENSITY);
        let PRESSURE_J = PRESSURE_CONSTANT * (objects[j].density - REST_DENSITY);

        let p_x = -1 * dir[0]/r * MASS * (PRESSURE_J + PRESSURE_I) / (2 * objects[j].density) * pressureGradientKernel(r, MAX_KERNAL_DIST);
        let p_y = -1 * dir[1]/r * MASS * (PRESSURE_J + PRESSURE_I) / (2 * objects[j].density) * pressureGradientKernel(r, MAX_KERNAL_DIST);
        let p_z = -1 * dir[2]/r * MASS * (PRESSURE_J + PRESSURE_I) / (2 * objects[j].density) * pressureGradientKernel(r, MAX_KERNAL_DIST);
        
        objects[i].acceleration[0] += p_x;
        objects[i].acceleration[1] += p_y;
        objects[i].acceleration[2] += p_z;

        objects[j].acceleration[0] -= p_x;
        objects[j].acceleration[1] -= p_y;
        objects[j].acceleration[2] -= p_z;

        // Compute viscosity
        vec3.sub(v_diff, objects[j].velocity, objects[i].velocity);
        let v_scalar = MU * MASS * (1/ objects[j].density)  * viscosityKernel(r, MAX_KERNAL_DIST);
        vec3.scale(viscosity, v_diff, v_scalar);

        vec3.add(objects[i].acceleration, objects[i].acceleration, viscosity);    
        vec3.sub(objects[j].acceleration, objects[j].acceleration, viscosity); 
        }
    }
    vec3.scale(objects[i].acceleration, objects[i].acceleration, 1/objects[i].density);  
  }
}

function densityKernel(r, h) {
  if (r > h) {
    return 0;
  }

  return C * Math.pow((Math.pow(h, 2) - Math.pow(r, 2)), 3);  
}

function viscosityKernel(r, h) {
  if (r > h) {
    return 0;
  }

  return  C2 * (h - r);
}

function pressureGradientKernel(r, h) {
  if (r > h) {
    return 0;
  }

  return C3 * Math.pow((h - r), 3); 
}

function setupGeo(gl, shader) {
  if (THREE_D){
    for (let i = 0; i < Math.pow(NUM_PARTICLES, 1/3); i++) {
      for (let j = 0; j < Math.pow(NUM_PARTICLES, 1/3); j++) {
        for (let k = 0; k < Math.pow(NUM_PARTICLES, 1/3); k++) {
          let position = [i, j, k]; 
          let velocity = [0,0,0]; 
          let p = new Particle(gl, shader, 1, position, velocity, [1,1,1,1]);
          objects.push(p);
        }
      }
    }
  } else {
    for (let i = 0; i < NUM_PARTICLES; i++) {
      let position = [(i % 20) * SPACING - 5, Math.floor(i/20) * SPACING - 5, 0];
      let velocity = [0,0,0];
      let p = new Particle(gl, shader, 1, position, velocity, [1,1,1,1]);
      objects.push(p);
    }
  }
  
}

function start() {
  // TODO: Remove extraneous stuff from this function
  console.log('Started up WebGL');
  canvas = $('#glCanvas')[0];
  let text = $('#text')[0];
  textCtx = text.getContext('2d');

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
  // Create lines
  lines = [
    new Line(gl, program, [-WALL_DIST, - 10, WALL_DIST, WALL_DIST, -10, WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, - 10, -WALL_DIST, WALL_DIST, -10, -WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, WALL_DIST, -WALL_DIST, WALL_DIST, WALL_DIST, -WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, - 10, -WALL_DIST, -WALL_DIST, WALL_DIST, -WALL_DIST,]),
    new Line(gl, program, [WALL_DIST, - 10, -WALL_DIST, WALL_DIST, WALL_DIST, -WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, - 10, WALL_DIST, -WALL_DIST, WALL_DIST, WALL_DIST]),
    new Line(gl, program, [WALL_DIST, - 10, WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, - 10, WALL_DIST, -WALL_DIST, - 10, -WALL_DIST]),
    new Line(gl, program, [WALL_DIST, - 10, WALL_DIST, WALL_DIST, - 10, -WALL_DIST]),
    new Line(gl, program, [-WALL_DIST, WALL_DIST, WALL_DIST, -WALL_DIST, WALL_DIST, -WALL_DIST]),
    new Line(gl, program, [WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST, WALL_DIST, -WALL_DIST]),
  ]

  setupGeo(gl, program);
  if (NORMALIZE_DENSITY){
    normalizeDensity();
  }

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
  let theta = (ev.clientX - canvas.width/2.0) / (canvas.width/2.0); // Ranges from 
  let phi = (canvas.height/2.0 - ev.clientY) / (canvas.height/2.0);
  theta *= (Math.PI / 2);
  phi *= (Math.PI / 2);

  camera.position[0] = Math.sin(theta) * Math.cos(phi) * 3.0;
  camera.position[1] = Math.sin(phi) * 3.0;
  camera.position[2] = Math.cos(theta) * Math.cos(phi) * 3.0;
}