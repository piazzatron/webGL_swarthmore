/*jshint esversion: 6 */
'use strict';

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
  constructor(gl, shader, vertexBuffer, normalBuffer, position = [0, 0, 0], rotation = [0, 0, 0], velocity = [0, 0, 0]) {
    this.shader = shader;
    this.vertexBufferInfo = vertexBuffer;
    this.normalBufferInfo = normalBuffer;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferInfo.buffer);
    gl.enableVertexAttribArray(this.attrs[0]);
    gl.vertexAttribPointer(this.attrs[0], 3, gl.FLOAT, false, 0, 0);

    // Bind the normals array
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBufferInfo.buffer);
    gl.enableVertexAttribArray(this.attrs[1]);
    gl.vertexAttribPointer(this.attrs[1], 3, gl.FLOAT, false, 0, 0);

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

    gl.drawArrays(primitive, 0, this.vertexBufferInfo.numComponents);
  }

  // TODO: Incorporate timestep into this
  update() {
    let dt = TIME_STEP;
    vec3.set(this.scaledVelocity, 0, 0, 0);
    // TODO: Clamp max accel
    vec3.scale(this.acceleration, this.acceleration, dt);
    vec3.add(this.velocity, this.acceleration, this.velocity);
    vec3.scale(this.scaledVelocity, this.velocity, dt);
    vec3.add(this.position, this.position, this.scaledVelocity);
  }
}

class Plane extends Drawable {
  constructor(gl, shader, position, orientation) {
    const vertices = [0.5, 0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0];
    const vertexInfo = new BufferInfo(gl, vertices, vertices.length/3);
    const normalInfo = new BufferInfo(gl, vertices, vertices.length/3);
    const uniforms = ["a_position", "a_normal"];
    super(gl, shader, vertexInfo, normalInfo, position, orientation, [0,0,0]);
  }

  draw(gl, camera) {
    const primitive = gl.TRIANGLE_FAN;
    super.draw(gl, camera, primitive);
  }

  update(){
  }
}

class Sphere extends Drawable {
  constructor(gl, shader, h_step, v_step, position, rotation, velocity) {
    const sphere = Sphere.createGeo(h_step, v_step);
    const vertexInfo = new BufferInfo(gl, sphere, sphere.length/3);
    const normalInfo = new BufferInfo(gl, sphere, sphere.length/3);
    const uniforms = ["a_position", "a_normal"];
    super(gl, shader, vertexInfo, vertexInfo, position, rotation, velocity); 
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

class Particle extends Drawable {
  constructor(gl, shader, mass = 1, position = [0,0,0], velocity = [0,0,0], color = [0,0,0,0]) {
    const vertexInfo = new BufferInfo(gl, [0,0,0], 1);
    super(gl, shader, vertexInfo, vertexInfo, position, [0,0,0], velocity);

    this.mass = mass;
    this.color = vec4.create();
    this.acceleration = vec3.create();
    this.pressure = 0; 
    this.density = 0;
    this.viscocity = 0;
    vec4.set(this.color, color[0], color[1], color[2], color[3]);
  }

  draw(gl, camera) {
    // Set uniforms
    const primitive = gl.POINTS;
    let density_loc = gl.getUniformLocation(this.shader, "u_density");
    gl.uniform1f(density_loc, this.density);

    super.draw(gl, camera, primitive);
  }

  update() {
    // Collision detection
    let collided = false;
    let wallPos = WALL_DIST;

    if (this.position[0] > wallPos) {
      this.position[0] = wallPos;
      this.velocity[0] *= -1;
      collided = true;
    } else if (this.position[0] < -wallPos) {
      this.position[0] = -wallPos;
      this.velocity[0] *= -1;
      collided = true;
    // } else if (this.position[1] > wallPos) {
    //   this.position[1] = wallPos;
    //   this.velocity[1] *= -1;
    //   collided = true;
    // }
    } 

    if (this.position[1] < -10) {
      this.position[1] = -10;
      this.velocity[1] *= -1;
      collided = true;
    } else if (this.position[2] > wallPos) {
      this.position[2] = wallPos;
      this.velocity[2] *= -1;
      collided = true;
    } 

    if (this.position[2] < -wallPos) {
      this.position[2] = -wallPos;
      this.velocity[2] *= -1;
      collided = true;
    } 

    // TODO: Should dampen only in the correct direction YA
    if (collided) {
      vec3.scale(this.velocity, this.velocity, DAMPENING); // Dampen
    }

    super.update();
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