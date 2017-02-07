var NUM_TRIANGLES = 3;
var FOV = 45;
var NEAR = 0.01;
var FAR = 10;
var OBJ_TRANSLATION = [0, 0, -4];

var gl;
var vertexBuffer;
var colorBuffer;
var program;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var tMatrix = mat4.create();
var tInv = mat4.create();


function start() {
	console.log('Started up WebGL')
	var canvas = $('#glCanvas')[0];

	gl = initWebGL(canvas);

	if (!gl) {
		return;
	}

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	// Set clear color to black, fully opaque
	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	// Enable depth testing
	gl.enable(gl.DEPTH_TEST);
	// Near things obscure far things
	gl.depthFunc(gl.LEQUAL	);
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
	pMatrixLoc = gl.getUniformLocation(program, "pMatrix");
	gl.uniformMatrix4fv(pMatrixLoc, false, pMatrix);

	// Translate the object
	mat4.translate(tMatrix, tMatrix, OBJ_TRANSLATION);
	mat4.invert(tInv, tMatrix);
	mat4.multiply(mvMatrix, mvMatrix, tMatrix);

	// Setup buffers
	vertexBuffer = gl.createBuffer(); // Create a buffer
	colorBuffer = gl.createBuffer();

	// Load data into buffers
	setupGeo();
	setupColors();

	// Draw it
	render();

	console.log('Finished');
}

function randrange(min, max) {
	return min + (Math.random() * (max - min)); 
}

function setupGeo() {
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	var positions = [];

	for (var i = 0; i < NUM_TRIANGLES; i++) {
		positions = positions.concat(createRect());
	}

	console.log("Positions:" + positions);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
}

function setupColors() {
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	var colors = [];
	for (var i = 0; i < NUM_TRIANGLES * 3; i++) {
		colors = colors.concat([Math.random(), Math.random(), Math.random(), 1.0]);
	}
	console.log("Colors:" + colors);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
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

function draw() {
	var primitiveType = gl.TRIANGLE_STRIP;
	var offset = 0;

	// Position
	// Get the location of position attribute
	var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
	// Enable the array for drawing
	gl.enableVertexAttribArray(positionAttributeLocation);
	// Bind it to the ARRAY BUFFER target
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); 
	// Tell openGL how to interpret the array + also bind the array to the attribute
	gl.vertexAttribPointer(
    positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    // Color
    var colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

    // Draw them!
	gl.drawArrays(primitiveType, offset, NUM_TRIANGLES * 3);

	console.log("Finished drawing");
}

function render() {
	requestAnimFrame(render);
	// TODO: Move this outside render
	// TODO: Have this rotating around itself - either give it an offset, or offset the camera

	mat4.multiply(mvMatrix, mvMatrix, tInv);
	mat4.multiply(mvMatrix, mvMatrix, tMatrix);
	mat4.rotateY(mvMatrix, mvMatrix, 0.1);

	// Translate

	var uMVLocation = gl.getUniformLocation(program, "uMVMatrix");
	gl.uniformMatrix4fv(uMVLocation, false, mvMatrix);
	draw();
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