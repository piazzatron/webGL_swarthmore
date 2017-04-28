/*jshint esversion: 6 */

let i = 0;
let j = 0;
let WIDTH;
let HEIGHT;
let FAILS = 0;
let COMPLETE = false;
let FAIL = false;
let MAX_FAILS = 300;
let tiles = [];
let grid = [[]];
let TILE_SIZE = 20;
let NUM_COLS = 50;
let NUM_ROWS = 50;

Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
};

let Tile = function(image, label) {
  this.label = label;
  this.image = image;
  this.neighbors = {
    up: null,
    left: null,
    right: null,
    down: null
  };
};

function setup() {
  frameRate(60);
  strokeWeight(4);
  stroke(0, 255, 200);

  WIDTH = TILE_SIZE * NUM_COLS;
  HEIGHT = TILE_SIZE * NUM_ROWS;
  createCanvas(WIDTH, HEIGHT);

  let t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.ellipse(TILE_SIZE, 0, TILE_SIZE);
  let A = new Tile(t, 'A');

  t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.ellipse(0, TILE_SIZE, TILE_SIZE);
  let B = new Tile(t, 'B');

  t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.line(TILE_SIZE/2, 0, TILE_SIZE/2, TILE_SIZE);
  let C = new Tile(t, 'C');
  tiles.push(t);

  t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.line(0, TILE_SIZE/2, TILE_SIZE, TILE_SIZE/2);
  let D = new Tile(t, 'D');

  t = createGraphics(TILE_SIZE, TILE_SIZE);
  let E = new Tile(t, 'E');
  
  t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.ellipse(0, 0, TILE_SIZE);
  let F = new Tile(t, 'F');

  t = createGraphics(TILE_SIZE, TILE_SIZE);
  t.ellipse(TILE_SIZE, TILE_SIZE, TILE_SIZE);
  let G = new Tile(t, 'G');

  A.neighbors.up = new Set([B, C, F, G]);
  A.neighbors.left = new Set([B, C, E, F]);
  A.neighbors.right = new Set([B, D, F]);
  A.neighbors.down = new Set([B, D, E, G]);

  B.neighbors.up = new Set([A, D, E]);
  B.neighbors.left = new Set([A, D, G]);
  B.neighbors.right = new Set([A, C, E, G]);
  B.neighbors.down = new Set([A, C, F]);  

  C.neighbors.up = new Set([B, C, G]);
  C.neighbors.left = new Set([B, C, E, F]);
  C.neighbors.right = new Set([C, A, E, G]);
  C.neighbors.down = new Set([C, A, F]);  

  D.neighbors.up = new Set([A, D, E, F]);
  D.neighbors.left = new Set([A, D, G]);
  D.neighbors.right = new Set([B, D, F]);
  D.neighbors.down = new Set([B, D, E, G]);

  E.neighbors.up = new Set([A, D, F]);
  E.neighbors.left = new Set([B, C, F]);
  E.neighbors.right = new Set([A, C, G]);
  E.neighbors.down = new Set([B, D, G]);

  F.neighbors.up = new Set([B, C, G]);
  F.neighbors.left = new Set([A, D, G]);
  F.neighbors.right = new Set([A, C, E, G]);
  F.neighbors.down = new Set([B, D, E, G]);

  G.neighbors.up = new Set([A, D, E, F]);
  G.neighbors.left = new Set([B, C, E, F]);
  G.neighbors.right = new Set([B, D, F]);
  G.neighbors.down = new Set([A, C, F]);

  tiles = [A, B, C, D, F];
}

function makeCell() {
  let possibles;

  // TOP LEFT CORNER
  if (i === 0 && j === 0) {
    possibles = tiles;
  } else if (i === 0 && j !== 0) {
    possibles = Array.from(grid[0][j-1].neighbors.right);
  } else if (j === 0 && i !== 0) {
    possibles = Array.from(grid[i-1][0].neighbors.down);
  } else {
    possibles = Array.from(grid[i-1][j].neighbors.down.intersection(grid[i][j-1].neighbors.right));
  }

  if (!possibles.length) {
    console.log('Got stuck');
    FAIL = true;
    return false;
  }

  let index = Math.floor(Math.random() * possibles.length);
  grid[i][j] = possibles[index];

  return true;
}

function draw() {
  if (i < NUM_ROWS) {
    if (j < NUM_COLS) {
      if (makeCell()) {
        image(grid[i][j].image, j * TILE_SIZE, i * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        j += 1;
      } else {
        i = 0;
        j = 0;
        background(255);
      }
    } else {
      i += 1;
      j = 0;
      grid[i] = [];
    }
  } else {
    noLoop();
  }
}