"use strict";

var NUM_TRIANGLES = 1;
var FOV = 45;
var NEAR = 0.01;
var FAR = 10;
var OBJ_TRANSLATION = [0, 0, -3.5];
var DRAW_NORMALS = true;
var ROTATION_SPEED = 0.0;
var CAMERA_TRANSLATION = [0, 0, 0];
var CAMERA_LOOK = [0, 0, -1];
var PAUSE = false;
var CLEAR_COLOR = [0.9, 0.6, 0.0, 1.0];

var gl;
var canvas;
var vertexBuffer;
var colorBuffer;
var normalBuffer;
var normalLineBuffer;
var lights;
var program;
var positions;
var normals;
var normalLines;
var camera;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var tMatrix = mat4.create();
var cameraMatrix = mat4.create();
var tInv = mat4.create();
var previousLoc = {
	x: 0,
	y: 0
};

function Camera() {
	this.translation = vec3.create();
	this.look = vec3.create();
}

function Light(direction, power) {
	this.direction = direction;
	this.power = power;
}

function start() {
	console.log('Started up WebGL')
	canvas = $('#glCanvas')[0];

	gl = initWebGL(canvas);

	canvas.onmousemove = function(ev) {
		var dx = ev.clientX - previousLoc.x;
		var dy = ev.clientY - previousLoc.y;
		dx *= 0.01;
		dy *= 0.01;
		console.log(dx)
		console.log(dy)

		CAMERA_LOOK[0] += dx;
		CAMERA_LOOK[1] -= dy;

		previousLoc.x = ev.clientx;
		previousLoc.y = ev.clientY;
		
		console.log(CAMERA_LOOK);
	// var x = ev.clientX;
	// var y = ev.clientY;
	// x *= (1.0/canvas.width);
	// y *= (1.0/canvas.height);
	}

	if (!gl) {
		return;
	}

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(CLEAR_COLOR[0], CLEAR_COLOR[1], CLEAR_COLOR[2], CLEAR_COLOR[3]);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Init some shaders
	var vertexShaderSource = $('#vertex-shader')[0].text;
	var fragmentShaderSource = $('#fragment-shader')[0].text;
	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	program = createProgram(gl, vertexShader, fragmentShader);
	gl.useProgram(program);

	// Set the perspective matrix
	mat4.perspective(pMatrix, FOV, gl.canvas.width/gl.canvas.height, NEAR, FAR);
	console.log("pMatrix");
	console.log(pMatrix);
	var pMatrixLoc = gl.getUniformLocation(program, "pMatrix");
	gl.uniformMatrix4fv(pMatrixLoc, false, pMatrix);

	// Setup buffers
	vertexBuffer = gl.createBuffer(); // Create a buffer
	normalBuffer = gl.createBuffer();
	normalLineBuffer = gl.createBuffer();

	// Create the camera
	camera = new Camera();

	document.onmousedown = handleMouseDown;
	// Normal Line Buffer

	// Load data into buffers

	setupGeo();
	setupLights(lights);

	// Draw it
	render(camera);

	console.log('Finished');
}

function handleMouseDown(event) {
	PAUSE = !PAUSE;
}

function getNormal(vertices) {
	var v1 = vec3.create();
	var v2 = vec3.create();
	var cross = vec3.create();

	vec3.set(v1, vertices[3] - vertices[0], vertices[4] - vertices[1], vertices[5] - vertices[2]);
	vec3.set(v2, vertices[6] - vertices[3], vertices[7] - vertices[4], vertices[8] - vertices[5]);
	vec3.normalize(cross, vec3.cross(cross, v2, v1));
	return [cross[0], cross[1], cross[2]];
}

function getNormalLine(shape, normal) {
	var p1 = vec3.create();
	var p2 = vec3.create();
	var p3 = vec3.create();
	var midpt = vec3.create();
	var lineEnd = vec3.create();

	vec3.set(p1, shape[0], shape[1], shape[2]);
	vec3.set(p2, shape[3], shape[4], shape[5]);
	vec3.set(p3, shape[6], shape[7], shape[8]);
	
	vec3.add(midpt, p1, p2);
	vec3.add(midpt, midpt, p3);
	vec3.scale(midpt, midpt, 1/3.0);

	vec3.add(lineEnd, midpt, normal);
	return [midpt[0], midpt[1], midpt[2], lineEnd[0], lineEnd[1], lineEnd[2]];
}

function randrange(min, max) {
	return min + (Math.random() * (max - min)); 
}

function setupGeo() {
	positions = [];
	normals = [];
	// normalLines = [];

	for (var i = 0; i < NUM_TRIANGLES; i++) {
		var shape = createSphere(40, 40);
		positions = positions.concat(shape);
		for (var j = 0; j < shape.length; j += 3) {
			normals.push(positions[j])
			normals.push(positions[j+1])
			normals.push((positions[j+2]))
		}
	}

	// Position Buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	// Normal Buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
}

function setupLights(lights) {
	lights = []
	lights.push(new Light([0,0,0], 0));
}

function createRect() {
	var positions = [];
	var coords = 3;
	var numPoints = 3;
	for (var i = 0; i < numPoints; i++) {
		positions.push(randrange(-1, 1));
		positions.push(randrange(-1, 1));
		positions.push(randrange(-1, 1));
	}
	return positions;
}

function createSphere(h_step, v_step) {
	var theta;
	var phi;
	var vertices = []
	for (var i = 0; i < v_step; i++) {
		phi = (2 * Math.PI) * (i/(v_step * 1.0));
		for (var j = 0; j < h_step; j++) {
			theta = (2 * Math.PI) * (j/(h_step * 1.0));
			var x = Math.cos(theta) * Math.cos(phi);
			var y = Math.sin(phi);
			var z = Math.sin(theta) * Math.cos(phi)
			vertices.push(x);
			vertices.push(y);
			vertices.push(z);
		}
	}
	return vertices;
}

function setCameraMatrix() {
	var cam_x = vec3.create();
	var cam_y = vec3.create();
	var cam_z = vec3.create();
	var cam_up = vec3.create();
	var cam_t = vec3.create();

	vec3.set(cam_up, 0, 1, 0);
	vec3.set(cam_z, CAMERA_LOOK[0], CAMERA_LOOK[1], CAMERA_LOOK[2]);
	vec3.set(cam_t, CAMERA_TRANSLATION[0], CAMERA_TRANSLATION[1], CAMERA_TRANSLATION[2]);
	vec3.sub(cam_z, cam_t, cam_z); // Opposite of what you would imagine
	vec3.cross(cam_x, cam_up, cam_z);
	vec3.cross(cam_y, cam_z, cam_x);

	vec3.normalize(cam_x, cam_x);
	vec3.normalize(cam_y, cam_y);
	vec3.normalize(cam_z, cam_z);

	mat4.set(cameraMatrix,
	 cam_x[0], cam_x[1], cam_x[2], 0,
	 cam_y[0], cam_y[1], cam_y[2], 0,
	 cam_z[0], cam_z[1], cam_z[2], 0,
	 cam_t[0], cam_t[1], cam_t[2], 1);

	mat4.invert(cameraMatrix, cameraMatrix);
}

function draw() {
    gl.useProgram(program);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var primitiveType = gl.POINTS;
	var offset = 0;
	
	// Set camera rotation and translation
	setCameraMatrix();

    // Move the object!
    mat4.identity(mvMatrix);
	mat4.mul(mvMatrix, mvMatrix, cameraMatrix);
    mat4.translate(mvMatrix, mvMatrix, OBJ_TRANSLATION);
	mat4.rotateY(mvMatrix, mvMatrix, ROTATION_SPEED);
	// Multiply the camera matrix on

	// Set uniforms
	var uMVLocation = gl.getUniformLocation(program, "uMVMatrix");
	gl.uniformMatrix4fv(uMVLocation, false, mvMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); 
	var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); 
	var normalAttributeLocation = gl.getAttribLocation(program, "a_normal");
	gl.enableVertexAttribArray(normalAttributeLocation);
	gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

	// gl.drawArrays(primitiveType, offset, 3 * NUM_TRIANGLES);
	gl.drawArrays(primitiveType, offset, positions.length / 3);

	if (DRAW_NORMALS) {
		// drawNormals();
	}

	console.log("Finished drawing");
}

function render() {
	requestAnimFrame(render);
	if (!PAUSE) {
		draw();
	}
}

function initWebGL(canvas) {
	gl = null;
	gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	if (!gl) {
		alert('No WebGL support found.')
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

// Handlers

