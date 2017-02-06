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

	// Add some points
	var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

	var positionBuffer = gl.createBuffer(); // Create a buffer
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // Bind it to the ARRAY BUFFER target

	// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
	var size = 2;          // 2 components per iteration
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset);

	draw(program);

	console.log('Finished');
}

function randrange(min, max) {
	return min + (Math.random() * (max - min)); 
}

function createRect() {
	var positions = [];
	for (var i = 0; i < 3 * 2; i++) {
		positions.push(randrange(-1, 1));
	}
	return positions;
}

function draw(program) {
	var primitiveType = gl.TRIANGLE_STRIP;
	var offset = 0;

	for (var i = 0; i < NUM_TRIANGLES; i++) {
		var positions = createRect();
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
		gl.drawArrays(primitiveType, offset, 3);
	}

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