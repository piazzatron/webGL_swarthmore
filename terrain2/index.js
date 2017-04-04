/*jshint esversion: 6 */
'use strict';
const SCALE = 1;
const FOV = 45;
const NEAR = 0.01;
const FAR = 200;
const ROWS = 150;
const COLS = 150;
const HEIGHT = 2;
const SPACING = 0.3

let DRAW_NORMALS = true;
let ROTATION_SPEED = 0.0;
let CAMERA_TRANSLATION = [0, 0, 5];
let CAMERA_LOOK = [0, 0, 0];
let PAUSE = false;
let CLEAR_COLOR = [0, 0, 0.5, 1.0];

let vertices; // 2D array of vertices
let gl;
let dt = 1;
let lastTime = Date.now();
let canvas;
let offset = [-10, 0];
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

  for (var object of objects) {
    object.update(dt, currTime);
    object.normals = calculateNormals(object.vertices);
  }
}

function createVertices() {
  let vertices = []
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      vertices.push(j * SPACING);
      vertices.push(0);
      vertices.push(i * SPACING);
    }
  }
  return vertices;
}

function vertexFromIndex(index, vertices) {
  return [vertices[index], vertices[index+1], vertices[index+2]];
}

// TODO: This should be able to take an array
function getNormalForTri(v1, v2, v3) {
  let s1 = vec3.create();
  let s2 = vec3.create();
  let c1 = vec3.create();

  vec3.set(s1, v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  vec3.set(s2, v3[0] - v2[0], v3[1] - v2[1], v3[2] - v2[2]);
  vec3.cross(c1, s1, s2);
  vec3.normalize(c1, c1);
  return c1;
}

function calculateNormals(vertices) {
  let v1 = vec3.create();
  let v2 = vec3.create();
  let v3 = vec3.create();

  function getIndex(row, col) {
    return row * (COLS) * 3 + (col * 3);
  }

  let normals = []

  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      // Hack to not deal w/edge cases yet
      if (i == 0 || i == ROWS - 1 || j == 0 || j == COLS - 1) {
        normals.push(0);
        normals.push(0);
        normals.push(0);
        continue;
      }

      let i1 = getIndex(i, j-1);
      let i2 = getIndex(i, j);
      let i3 = getIndex(i-1, j);     

      let i4 = getIndex(i-1, j);
      let i5 = getIndex(i, j);
      let i6 = getIndex(i, j+1);

      let i7 = getIndex(i, j-1);
      let i8 = getIndex(i+1, j);
      let i9 = getIndex(i, j);

      let i10 = getIndex(i, j);
      let i11 = getIndex(i+1, j);
      let i12 = getIndex(i, j+1);
      
      let n1 = getNormalForTri(vertexFromIndex(i1, vertices), vertexFromIndex(i2, vertices), vertexFromIndex(i3, vertices));
      let n2 = getNormalForTri(vertexFromIndex(i4, vertices), vertexFromIndex(i5, vertices), vertexFromIndex(i6, vertices));
      let n3 = getNormalForTri(vertexFromIndex(i7, vertices), vertexFromIndex(i8, vertices), vertexFromIndex(i9, vertices));
      let n4 = getNormalForTri(vertexFromIndex(i10, vertices), vertexFromIndex(i11, vertices), vertexFromIndex(i12, vertices));

      // TODO: Fix
      vec3.lerp(v1, n1, n2, 0.5);
      vec3.lerp(v2, n3, n4, 0.5);
      vec3.lerp(v3, v1, v2, 0.5);
      vec3.normalize(v3, v3);

      normals.push(v3[0]);
      normals.push(v3[1]);
      normals.push(v3[2]);
    }
  }

  return normals;
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

  gl.getExtension("EXT_frag_depth");
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

  vertices = createVertices();
  // Create the object
  objects.push(new Mesh(gl, program, vertices, [-COLS*SPACING/2, 0, -ROWS*SPACING/2]));
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