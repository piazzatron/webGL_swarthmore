/*jshint esversion: 6 */

let i = 0;
let j = 0;
let WIDTH;
let HEIGHT;
let FAILS = 0;
let COMPLETE = false;
let FINISHED_SETUP = false;
let FAIL = false;
let MAX_FAILS = 300;
let tiles = [];
let grid = [[]];
let INPUT_SIZE = 50;
let TILE_SIZE = 10;
let CANVAS_SIZE = 300;
let NUM_TILES = CANVAS_SIZE/TILE_SIZE;
let STRIDE = 5;
let img;
let tile_map = {
  top: {}, 
  left: {},
  right: {},
  bottom: {}
};
let tile_set;
let wave = [];
let lefts = [];
let collapsed = [];

Set.prototype.intersect = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
};

Array.prototype.sum = function() {
  return this.reduce((acc, value) => {
    return acc + value;
  }, 0);
};

// Returns a list of indices where are nonzero
Array.prototype.idx = function() {
  return this.map((val, idx) => {
    return (val === 0) ? 0 : idx;
  }).filter((val) => {
    return val > 0;
  });
};

let Tile = function(image, sides) {
  this.image = image;
  this.sides = sides;
  this.count = 1;
};

function setup() {
  /****************** SETUP PROCESSING *******************/
  noLoop();
  frameRate(60);
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  
  /****************** GET SUBIMAGES *******************/
  img = loadImage('images/flowa.png',() => {
    console.log("success");
    image(img, 0, 0);

    console.log ("Breaking images into tiles...");
    let tiles_hash = {}; // image hash -> tile

    for (let i = 0; i < INPUT_SIZE - TILE_SIZE; i+=STRIDE) {
      for (let j = 0; j < INPUT_SIZE - TILE_SIZE; j+=STRIDE) {
        console.log(i, j);
        let tile_img = get(i, j, TILE_SIZE, TILE_SIZE);
        let tileNum = tiles.length;
        tile_img.loadPixels();
        let tile_hash = String(tile_img.pixels);

        // Have we seen this image before?
        if (tiles_hash[tile_hash]) {
          // Increment the count
          tiles_hash[tile_hash].count += 1;
          continue;
        }

        let top = tile_img.get(0, 0, TILE_SIZE, 1);
        top.loadPixels();
        let top_hash = String(top.pixels);

        let bottom = tile_img.get(0, TILE_SIZE - 1, TILE_SIZE, 1);
        bottom.loadPixels();
        let bottom_hash = String(bottom.pixels);

        let left = tile_img.get(0, 0, 1, TILE_SIZE);
        left.loadPixels();
        let left_hash = String(left.pixels);

        let right = tile_img.get(0, TILE_SIZE - 1, TILE_SIZE, 1);
        right.loadPixels();
        let right_hash = String(right.pixels);

        let sides = {
          top: top_hash,
          bottom: bottom_hash,
          left: left_hash, 
          right: right_hash
        };

        let tile = new Tile(tile_img, sides);
        tiles.push(tile);
        tiles_hash[tile_hash] = tile;

        // Hash the edges
        if (!tile_map.top[top_hash]) {
          tile_map.top[top_hash] = new Set([tileNum]);
        } else {
          tile_map.top[top_hash].add(tileNum);
        }        

        if (!tile_map.left[left_hash]) {
          tile_map.left[left_hash] = new Set([tileNum]);
        } else {
          tile_map.left[left_hash].add(tileNum);
        }

        if (!tile_map.right[right_hash]) {
          tile_map.right[right_hash] = new Set([tileNum]);
        } else {
          tile_map.right[right_hash].add(tileNum);
        }

        if (!tile_map.bottom[bottom_hash]) {
          tile_map.bottom[bottom_hash] = new Set([tileNum]);
        } else {
          tile_map.bottom[bottom_hash].add(tileNum);
        }

        console.log("Preprocessed an image!");
      }
    }

  /****************** INIT_WAVE && CHANGED && TILE_SET*******************/

  wave = [];
  collapsed = [];
  for (let i = 0; i < NUM_TILES; i++) {
    wave[i] = [];
    collapsed[i] = [];
    for (let j = 0; j < NUM_TILES; j++) {
      collapsed[i][j] = false;
      wave[i][j] = [];
      for (let t = 0; t < tiles.length; t++) {
        wave[i][j][t] = 1;
      }
    }
  }

  // tile_set = set(1,2,3,4...tiles.length)
  tile_set = new Set(Array(tiles.length).keys());

  loop(); // kickoff drawing
  FINISHED_SETUP = true;
  }, () => {console.log("FAIL");}
  );
}

function observe() {
  let min_pos = tiles.length + 1;
  let min_x = -1;
  let min_y = -1;
  for (let i = 0; i < NUM_TILES; i++) {
    for (let j = 0; j < NUM_TILES; j++) {
      let num_pos = wave[i][j].sum();

      // This is where we would put the entropy calculation in 
      if (num_pos > 1 && num_pos < min_pos) {
        min_pos = num_pos;
        min_x = i;
        min_y = j;
      }
    } 
  }

  if (min_x != -1) {
    collapsed[min_x][min_y] = true;
    collapse(min_x, min_y);
    return true;
  } 

  return false;
}

// Does this work?
function collapse(x, y) {
  let num_pos = wave[x][y].sum();
  let r = Math.random() * num_pos;
  let sum = 0;

  for (let i = 0; i < num_pos; i++) {
    // TODO: this should take in an array with distributions!
    sum += wave[x][y][i];

    if (sum > r && sum < r + 1) {
      continue;
    }

    wave[x][y][i] = 0;
  }
}

function propagate() {
  let didChange = false;

  for (let i = 0; i < NUM_TILES; i++) {
    for (let j = 0; j < NUM_TILES; j++) {
      if (collapsed[i][j]) {
        didChange = true;
        collapsed[i][j] = false;

        // Top
        if (i != 0) {
          updateWave(i-1, j);
          if (tiles[i-1][j].sum() == 1) {
            collapsed[i-1][j] = true;
          }
        }

        // Bottom
        if (i != NUM_TILES-1) {
          updateWave(i+1, j);
          if (tiles[i+1][j].sum() == 1) {
            collapsed[i+1][j] = true;
          }
        }

        // left
        if (j != 0) {
          updateWave(i, j-1);
          if (tiles[i][j-1].sum() == 1) {
            collapsed[i][j-1] = true;
          }
        }

        if (j != NUM_TILES-1) {
          updateWave(i, j+1);
          if (tiles[i][j+1].sum() == 1) {
            collapsed[i][j+1] = true;
          }
        }
      }
    }
  }

  return didChange;
}

function updateWave(row, col) {
  // IDEA: For each possible tile, see if it can still exist. 
  // TODO: edge cases
  for (let i of wave[row][col]) {
    if (i) {
      // Possible tiles which might go on top
      let th = tiles[i].sides.top;
      let t_set = new Set(tile_map.bottom[th]);

      let bh = tiles[i].sides.bottom;
      let b_set = new Set(tile_map.top[bh]);

      let rh = tiles[i].sides.right;
      let r_set = new Set(tile_map.left[rh]);

      let lh = tiles[i].sides.left;
      let l_set = new Set(tile_map.right[lh]);

      // Need a (literal) edge case here
      // What if there is no match? Shit! Do we find the closest?
      let t_pos = t_set.intersect(new Set(wave[row-1][col].idx()));
      let b_pos = b_set.intersect(new Set(wave[row+1][col].idx()));
      let l_pos = l_set.intersect(new Set(wave[row][col-1].idx()));
      let r_pos = r_set.intersect(new Set(wave[row][col+1].idx()));

      wave[row][col][i] == t_pos.size && b_pos.size && l_pos.size && r_pos.size;
      // Let's do a set intersect?
      // t_neighbors = topNeighbor.idx()
      // We need at least one of the top indices to be included in the b_set
    }
  }
}

function drawGrid() {
  // This is uber inefficient, should optimize later

  for (let i = 0; i < NUM_TILES; i++) {
    for (let j = 0; j < NUM_TILES; j++) {
      let num_pos = wave[i][j].sum();

      if (num_pos == 1) {
        // We found a collapsed cell!
        for (let k = 0; k < NUM_TILES; k++) {
          if (wave[i][j][k]) {
            image(tiles[k].image, j * TILE_SIZE, i * TILE_SIZE);
          }
        }
      } else {
        // Draw placeholder
        rect(j * TILE_SIZE, i * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function draw() {
  // for (let i = 0; i < tiles.length; i++) {
  //   console.log("DRAWING IMAGE!")
  //   image(tiles[i], (i * 15), 0);

  //   if (i == tiles.length - 1) {
  //     noLoop();
  //   }
  // }  

  if (!FINISHED_SETUP) {
    return;
  }

  if (observe()) {
    while(propagate()){}
    drawGrid();
    // Draw that GRID son!
  } else {
    console.log("RAN INTO A CONTRADICTION");
  }


  // Just draw the grid each time :)
  
}