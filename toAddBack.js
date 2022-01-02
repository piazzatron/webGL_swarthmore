

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

function getNormal(vertices) {
  var v1 = vec3.create();
  var v2 = vec3.create();
  var cross = vec3.create();

  vec3.set(v1, vertices[3] - vertices[0], vertices[4] - vertices[1], vertices[5] - vertices[2]);
  vec3.set(v2, vertices[6] - vertices[3], vertices[7] - vertices[4], vertices[8] - vertices[5]);
  vec3.normalize(cross, vec3.cross(cross, v2, v1));
  return [cross[0], cross[1], cross[2]];
}

function Light(direction, power) {
  this.direction = direction;
  this.power = power;
}