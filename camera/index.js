/*jshint esversion: 6 */

  'use strict';

  const NUM_SHAPES = 1;
  const FOV = 45;
  const NEAR = 0.01;
  const FAR = 10;
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

  class BufferInfo {
    // Contains position and normal bufferinfo for each object
    constructor(gl, data, numComponents) {
      this.buffer = gl.createBuffer();
      this.numComponents = numComponents;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
  }

  class Drawable {
    constructor(gl, shader, vertexBuffer, normalBuffer, translation = [0, 0, 0], rotation = [0, 0, 0], velocity = [0, 0, 0]) {
      this.shader = shader;
      this.vertexBufferInfo = vertexBuffer;
      this.normalBufferInfo = normalBuffer;
      this.attrs = this.getAttrLocations(this.shader, ['a_position', 'a_normal']);
      this.translation = vec3.create();
      this.rotation = vec3.create();
      console.log(this.vertexBufferInfo)
    }

    getAttrLocations(shader, attr_strings) {
      // TODO: Look up a more robust approach for this
      return attr_strings.map((location) => {
        return gl.getAttribLocation(shader, location);
      });
    }

    draw(gl, camera) {
      // TODO: We shouldn't get this location on each draw
      const u_mvMatrix = gl.getUniformLocation(this.shader, 'u_mvMatrix');
      const primitiveType = gl.POINTS;

      gl.useProgram(this.shader);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Bind the vertex array
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferInfo.buffer);
      gl.enableVertexAttribArray(this.attrs[0]);
      gl.vertexAttribPointer(this.attrs[0], 3, gl.FLOAT, false, 0, 0);

      // Bind the normals array
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBufferInfo.buffer);
      gl.enableVertexAttribArray(this.attrs[1]);
      gl.vertexAttribPointer(this.attrs[1], 3, gl.FLOAT, false, 0, 0);

      // TODO: Does this go here? Could maybe go in update function...
      let viewMatrix = camera.getCameraMatrix();
      let modelMatrix = mat4.create();
      let mvMatrix = mat4.create();

      mat4.translate(modelMatrix, modelMatrix, this.translation);
      mat4.rotateX(modelMatrix, modelMatrix, this.rotation[0]);
      mat4.rotateY(modelMatrix, modelMatrix, this.rotation[1]);
      mat4.rotateZ(modelMatrix, modelMatrix, this.rotation[2]);
      mat4.mul(mvMatrix, viewMatrix, modelMatrix);
      gl.uniformMatrix4fv(u_mvMatrix, false, mvMatrix);

      gl.drawArrays(primitiveType, 0, this.vertexBufferInfo.numComponents);
    }

    update() {
      this.position += this.velocity;
    }
  }

  function draw() {
    for (var object of objects) {
      object.draw(gl, camera);
    }

    console.log("Finished drawing");
  }

  class Sphere extends Drawable {
    constructor(gl, shader, h_step, v_step) {
      const sphere = Sphere.createGeo(h_step, v_step);
      const vertexInfo = new BufferInfo(gl, sphere, sphere.length/3);
      const normalInfo = new BufferInfo(gl, sphere, sphere.length/3);
      const uniforms = ["a_position", "a_normal"];
      super(gl, shader, vertexInfo, vertexInfo, uniforms); 
    }

    static createGeo(h_step, v_step) {
      let theta;
      let phi;
      let vertices = [];
      for (let i = 0; i < v_step; i++) {
        phi = (2 * Math.PI) * (i/(v_step * 1.0));
        for (let j = 0; j < h_step; j++) {
          theta = (2 * Math.PI) * (j/(h_step * 1.0));
          let x = Math.cos(theta) * Math.cos(phi);
          let y = Math.sin(phi);
          let z = Math.sin(theta) * Math.cos(phi);
          vertices.push(x);
          vertices.push(y);
          vertices.push(z);
        }
      }
      return vertices;
    }
  }

  class Camera {
    constructor(translation, look, velocity = [0,0,0.02]) {
      this.translation = vec3.create();
      this.lookAt = vec3.create();
      this.up = vec3.create();
      this.velocity = vec3.create();
      this.cameraMatrix = mat4.create();

      vec3.set(this.translation, translation[0], translation[1], translation[2]);
      vec3.set(this.lookAt, look[0], look[1], look[2]);
      vec3.set(this.up, 0, 1, 0);
      vec3.set(this.velocity, velocity[0], velocity[1], velocity[2]);
    }

    getCameraMatrix() {
      // TODO: Optimization: if we didn't update last tick, then just return the prev matrix 
      let x_dir = vec3.create();
      let y_dir = vec3.create();
      let z_dir = vec3.create();

      vec3.sub(z_dir, this.translation, this.lookAt); // Opposite of what you would imagine
      vec3.cross(x_dir, this.up, z_dir);
      vec3.cross(y_dir, z_dir, x_dir);

      vec3.normalize(x_dir, x_dir);
      vec3.normalize(y_dir, y_dir);
      vec3.normalize(z_dir, z_dir);

      mat4.set(this.cameraMatrix,
       x_dir[0], x_dir[1], x_dir[2], 0,
       y_dir[0], y_dir[1], y_dir[2], 0,
       z_dir[0], z_dir[1], z_dir[2], 0,
       this.translation[0], this.translation[1], this.translation[2], 1);
      // In Progress: Is this
      mat4.invert(this.cameraMatrix, this.cameraMatrix);
      return this.cameraMatrix;
    }

    update() {
      vec3.add(this.translation, this.translation, this.velocity);
    }
  }

  function update() {
    camera.update();
    for (var object of objects) {
      object.update();
    }
  }

  function setupGeo(gl, shader) {
    for (let i = 0; i < NUM_SHAPES; i++) {
      objects.push(new Sphere(gl, program, 40, 40));
    }
  }

  function start() {
    // TODO: Remove extraneous stuff from this function
    console.log('Started up WebGL');
    canvas = $('#glCanvas')[0];

    gl = initWebGL(canvas);

    // canvas.onmousemove = mouseHandler;

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

    document.onmousedown = handleMouseDown;

    setupGeo(gl);

    // Draw it
    render();

    console.log('Finished');
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
    var scale = 0.001;
    var dx = ev.clientX - previousLoc.x;
    var dy = ev.clientY - previousLoc.y;
    dx *= scale;
    dy *= scale;

    CAMERA_LOOK[0] += dx;
    CAMERA_LOOK[1] -= dy;

    previousLoc.x = ev.clientX;
    previousLoc.y = ev.clientY;
    
    console.log(CAMERA_LOOK);
}