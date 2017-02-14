"use strict";

var NUM_TRIANGLES = 1000;
var FOV = 45;
var NEAR = 0.01;
var FAR = 10;
var OBJ_TRANSLATION = [0, 0, -3.5];
var DRAW_NORMALS = true;
var ROTATION_SPEED = 0.035;
var PAUSE = false;

var gl;
var vertexBuffer;
var colorBuffer;
var normalBuffer;
var normalLineBuffer;
var lights;
var program;
var positions;
var normals;
var normalLines;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var tMatrix = mat4.create();
var tInv = mat4.create();

function Light(direction, power) {
	this.direction = direction;
	this.power = power;
}

function start() {
	console.log('Started up WebGL')
	var canvas = $('#glCanvas')[0];

	gl = initWebGL(canvas);

	if (!gl) {
		return;
	}

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	// Set clear color to black, fully opaque
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	// Enable depth testing
	gl.enable(gl.DEPTH_TEST);
	// Near things obscure far things
	gl.depthFunc(gl.LEQUAL);
	// Clear the color as well as the depth buffer.
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
	var pMatrixLoc = gl.getUniformLocation(program, "pMatrix");
	gl.uniformMatrix4fv(pMatrixLoc, false, pMatrix);

	// Translate the object
	mat4.translate(mvMatrix, mvMatrix, OBJ_TRANSLATION);
	console.log(mvMatrix);

	// Setup buffers
	vertexBuffer = gl.createBuffer(); // Create a buffer
	normalBuffer = gl.createBuffer();
	normalLineBuffer = gl.createBuffer();

	document.onmousedown = handleMouseDown;
	// Normal Line Buffer

	// Load data into buffers

	setupGeo();
	setupLights(lights);

	// Draw it
	render();

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
	normalLines = [];

	for (var i = 0; i < NUM_TRIANGLES; i++) {
		var shape = createRect();
		var normal = getNormal(shape);
		positions = positions.concat(shape);

		// Add the normal three times
		for (var j = 0; j < 3; j++) {
			normals = normals.concat(normal);
		}

		var normalLine = getNormalLine(shape, normal);
		normalLines.push(normalLine);

	}

	console.log("Normals" + normals);
	console.log("Positions:" + positions);

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
	// return [-1, 1, 0, 1, 1, 0, 0, 0, 0];
}

function draw() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var primitiveType = gl.TRIANGLE_STRIP;
	var offset = 0;

    // Draw them!
    gl.useProgram(program);
	mat4.rotateY(mvMatrix, mvMatrix, ROTATION_SPEED);

	// Translate

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

	gl.drawArrays(primitiveType, offset, 3 * NUM_TRIANGLES);

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