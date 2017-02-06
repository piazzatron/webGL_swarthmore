var gl;
var NUM_TRIANGLES = 3;

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
	gl.depthFunc(gl.LEQUAL);
	// Clear the color as well as the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Init some shaders
	var vertexShaderSource = $('#vertex-shader')[0].text;
	var fragmentShaderSource = $('#fragment-shader')[0].text;
	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	var program = createProgram(gl, vertexShader, fragmentShader);
	gl.useProgram(program);

	// Setup buffers
	var positionBuffer = gl.createBuffer(); // Create a buffer
	var colorBuffer = gl.createBuffer();

	// Load data into buffers
	setupGeo(positionBuffer);
	setupColors(colorBuffer);

	// Draw it
	draw(program, positionBuffer, colorBuffer);

	console.log('Finished');
}

function randrange(min, max) {
	return min + (Math.random() * (max - min)); 
}

function setupGeo(posBuffer) {
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
	var positions = [];

	for (var i = 0; i < NUM_TRIANGLES; i++) {
		positions = positions.concat(createRect());
	}
	console.log("Positions:" + positions);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
}

function setupColors(colorBuffer) {
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
	for (var i = 0; i < 3 * 2; i++) {
		positions.push(randrange(-1, 1));
	}
	return positions;
}

function draw(program, posBuffer, colorBuffer) {
	var primitiveType = gl.TRIANGLE_STRIP;
	var offset = 0;

	// Position
	// Get the location of position attribute
	var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
	// Enable the array for drawing
	gl.enableVertexAttribArray(positionAttributeLocation);
	// Bind it to the ARRAY BUFFER target
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); 
	// Tell openGL how to interpret the array + also bind the array to the attribute
	gl.vertexAttribPointer(
    positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Color
    var colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

    // Draw them!
	gl.drawArrays(primitiveType, offset, NUM_TRIANGLES * 3);

	console.log("Finished drawing");
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