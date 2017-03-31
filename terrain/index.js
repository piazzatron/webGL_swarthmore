/*jshint esversion: 6 */
'use strict';
const SCALE = 1;
const FOV = 45;
const NEAR = 0.01;
const FAR = 200;

let DRAW_NORMALS = true;
let ROTATION_SPEED = 0.0;
let CAMERA_TRANSLATION = [0, 0, 5];
let CAMERA_LOOK = [0, 0, 0];
let PAUSE = false;
let CLEAR_COLOR = [0, 0, 0.5, 1.0];


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
  }
}

function setupGeo(gl, shader) {
  let vertices = []
  for (let i = 0; i < 200; i++) {
    for (let j = 0; j < 200; j++) {
      // Vertex1
      vertices.push(i - 100);
      vertices.push(0);
      vertices.push(j - 100 );
      // Vertex2
      vertices.push(i + 1 - 100);
      vertices.push(0);
      vertices.push(j - 100);
    }
  }
  objects.push(new Mesh(gl, program, vertices));
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
  let theta = (ev.clientX - canvas.width/2.0) / (canvas.width/2.0); // Ranges from 
  let phi = (canvas.height/2.0 - ev.clientY) / (canvas.height/2.0);
  theta *= (Math.PI / 2);
  phi *= (Math.PI / 2);

  camera.position[0] = Math.sin(theta) * Math.cos(phi) * 3.0;
  camera.position[1] = Math.sin(phi) * 3.0;
  camera.position[2] = Math.cos(theta) * Math.cos(phi) * 3.0;
}