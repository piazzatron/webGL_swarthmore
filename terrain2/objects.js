/*jshint esversion: 6 */
'use strict';

class Drawable {
  constructor(gl, shader, vertices, normals, position = [0, 0, 0], rotation = [0, 0, 0], velocity = [0, 0, 0]) {
    this.shader = shader;
    this.elements = [] // [px, py, pz, color1, color2, color3, nx, ny, nz...]
    this.vertices = vertices;
    this.normals = normals;

    this.elementBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.vertexBuffer = gl.createBuffer();

    this.attrs = this.getAttrLocations(shader, ['a_position', 'a_normal']);
    this.u_mMatrix = gl.getUniformLocation(this.shader, 'u_mMatrix');
    this.u_vMatrix = gl.getUniformLocation(this.shader, 'u_vMatrix');

    this.position = vec3.create();
    this.rotation = vec3.create();
    this.velocity = vec3.create();
    this.scaledVelocity = vec3.create();
    this.acceleration = vec3.create();
    this.modelMatrix = mat4.create();
    this.mvMatrix = mat4.create();
 
    vec3.set(this.position, position[0], position[1], position[2]);
    vec3.set(this.rotation, rotation[0], rotation[1], rotation[2]);
    vec3.set(this.velocity, velocity[0], velocity[1], velocity[2]);
  }

  getAttrLocations(shader, attr_strings) {
    // TODO: Look up a more robust approach for this
    return attr_strings.map((location) => {
      return gl.getAttribLocation(shader, location);
    });
  }

  draw(gl, camera, primitive) {
    gl.useProgram(this.shader);

    // Bind the vertex array
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.attrs[0]);
    gl.vertexAttribPointer(this.attrs[0], 3, gl.FLOAT, false, 0, 0);

    // Bind the normals array
    // gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.DYNAMIC_DRAW);
    // gl.enableVertexAttribArray(this.attrs[1]);
    // gl.vertexAttribPointer(this.attrs[1], 3, gl.FLOAT, false, 0, 0);

    // Bind the element array
    // TODO: Don't create a new array each time
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.elements), gl.DYNAMIC_DRAW);

    // TODO: Does this go here? Could maybe go in update function...
    // TODO: We're creating these objects for every particle...
    let viewMatrix = camera.getCameraMatrix();

    mat4.fromScaling(this.modelMatrix, [0.1, 0.1, 0.1]);
    mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
    mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
    mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
    mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);

    gl.uniformMatrix4fv(this.u_mMatrix, false, this.modelMatrix);
    gl.uniformMatrix4fv(this.u_vMatrix, false, viewMatrix);

    gl.drawElements(primitive, this.elements.length, gl.UNSIGNED_SHORT, 0);
  }

  // TODO: Incorporate timestep into this
  update(dt = null) {
    let DT = dt ||TIME_STEP;
    vec3.set(this.scaledVelocity, 0, 0, 0);
    // TODO: Clamp max accel
    vec3.scale(this.acceleration, this.acceleration, DT);
    vec3.add(this.velocity, this.acceleration, this.velocity);
    vec3.scale(this.scaledVelocity, this.velocity, DT);
    vec3.add(this.position, this.position, this.scaledVelocity);
  }
}

class Line extends Drawable {
  constructor(gl, shader, positions, color = [0,0,0,0]) {
    const vertexInfo = new BufferInfo(gl, positions, 2);
    super(gl, shader, vertexInfo, vertexInfo);
    this.color = vec4.create();
    vec4.set(this.color, color[0], color[1], color[2], color[3]);
  }

  draw(gl, camera) {
    // Set uniforms
    const primitive = gl.LINES;

    super.draw(gl, camera, primitive);
  }
}

class Mesh extends Drawable {
  constructor(gl, shader, vertices, position = [0,0,0], color = [0,0,0,0]) {
    super(gl, shader, vertices, vertices, position);

    // Set up elements array
    let els = [];
    if (SMOOTH_SHADING) {
      for (let i = 0; i < ROWS-1; i++) {
        for (let j = 0; j < COLS; j++) {
          els.push((i*COLS) + j);
          els.push(((i+1)*COLS) + j);

          if (j == COLS-1) {
            els.push(((i+1)*COLS) + j);
            els.push((i+1)*COLS);
          }
        }
      }
    } else {
      for (let i = 0; i < ROWS-1; i++) {
        for (let j = 0; j < COLS; j++) {
          // first tri
          els.push(i*COLS+j);
          els.push(i*(COLS+1)+j);
          els.push(i*COLS+j+1);

          //second tri
          els.push(i*COLS+j+1);
          els.push(i*(COLS+1)+j);
          els.push(i*(COLS+1)+j+1);
        }
      }
    }


    this.elements = els;
    this.color = vec4.create();
    vec4.set(this.color, color[0], color[1], color[2], color[3]);
  }

  draw(gl, camera) {
    // Set uniforms
    
    const primitive = (SMOOTH_SHADING) ? gl.TRIANGLE_STRIP : gl.TRIANGLE;

    super.draw(gl, camera, primitive);
  }

  update(dt, offset) {
    this.updateHeights(dt, offset);
    super.update(dt);
  }

  updateHeights(dt, offset) {
    for (let i = 0; i < this.vertices.length; i+=3) {
      this.vertices[i+1] = HEIGHT * Math.sin(this.vertices[i] + offset) * Math.cos(this.vertices[i+2] + offset);
    }
  }
}

class Camera {
  constructor(position, look, velocity = [0, 0, 0]) {
    this.position = vec3.create();
    this.lookAt = vec3.create();
    this.up = vec3.create();
    this.velocity = vec3.create();
    this.cameraMatrix = mat4.create();

    vec3.set(this.position, position[0], position[1], position[2]);
    vec3.set(this.lookAt, look[0], look[1], look[2]);
    vec3.set(this.up, 0, 1, 0);
    vec3.set(this.velocity, velocity[0], velocity[1], velocity[2]);

    this.cameraMatrix = mat4.create();
  }

  getCameraMatrix() {
    // TODO: Optimization: if we didn't update last tick, then just return the prev matrix 
    let x_dir = vec3.create();
    let y_dir = vec3.create();
    let z_dir = vec3.create();

    vec3.sub(z_dir, this.position, this.lookAt); // Opposite of what you would imagine
    vec3.cross(x_dir, this.up, z_dir);
    vec3.cross(y_dir, z_dir, x_dir);

    vec3.normalize(x_dir, x_dir);
    vec3.normalize(y_dir, y_dir);
    vec3.normalize(z_dir, z_dir);

    mat4.set(this.cameraMatrix,
     x_dir[0], x_dir[1], x_dir[2], 0,
     y_dir[0], y_dir[1], y_dir[2], 0,
     z_dir[0], z_dir[1], z_dir[2], 0,
     this.position[0], this.position[1], this.position[2], 1);  

    // In Progress: Is this
    mat4.invert(this.cameraMatrix, this.cameraMatrix);
    return this.cameraMatrix;
  }

  update() {
    // vec3.add(this.position, this.position, this.velocity);
  }
}