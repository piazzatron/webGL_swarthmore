// Based on x & y, returns a number between 0 and 1
// This function has the important property of returning the same value for the same input!
// NOTE: & 7fffffff ensures that the largest number is 0xF0000000.  
//  Therefore Dividing 0xF0000000/2 = 0x40000000 = 1073741824.0 ensures we get a value between 0 and 2
'esversion: 6';
'use strict';
let hash = {}
let hash2 = {}
function PseudoRandom(x, y)
{  
   let str = 80*x + y;
   if (!hash[str]) {
      hash[str] = Math.random() * 2;
   }
   return hash[str]; 
}

function noise2d(x, y)
{  
   let str = 80*(x%80) + (y%80);
   if (!hash2[str]) {
      let corners = ( PseudoRandom(x-1, y-1)+PseudoRandom(x+1, y-1)+PseudoRandom(x-1, y+1)+PseudoRandom(x+1, y+1) ) / 16.0;
      let sides   = ( PseudoRandom(x-1, y)  +PseudoRandom(x+1, y)  +PseudoRandom(x, y-1)  +PseudoRandom(x, y+1) ) /  8.0; 
      let center  =  PseudoRandom(x, y) / 4.0;
      hash2[str] = corners + sides + center;
   }
   return hash2[str];
}

function noise3d(x, y, z)
{
   let corners = ( PseudoRandom(x-1, y-1, z+1)+PseudoRandom(x+1, y-1, z+1)+PseudoRandom(x-1, y+1, z+1)+PseudoRandom(x+1, y+1, z+1) +
                      PseudoRandom(x-1, y-1, z-1)+PseudoRandom(x+1, y-1, z-1)+PseudoRandom(x-1, y+1, z-1)+PseudoRandom(x+1, y+1, z-1)) / 32.0;
   let sides   = ( PseudoRandom(x-1, y, z)+PseudoRandom(x+1, y, z)+PseudoRandom(x, y-1, z)+PseudoRandom(x, y+1, z)+PseudoRandom(x, y, z-1)+PseudoRandom(x, y, z+1))/  12.0; 
   let center  =  PseudoRandom(x, y, z) / 4.0;

   return corners + sides + center;
}

function interpolate2(x, y, t)
{
   let angle = t * 3.1415927;
   let tmp = (1.0 - Math.cos(angle))*0.5;
   return x*(1-tmp) + y*tmp;
}

function interpolate4(b0, b1, b2, b3, t)
{
   let b01 = (1-t)*b0 + t*b1;
   let b12 = (1-t)*b1 + t*b2;
   let b23 = (1-t)*b2 + t*b3;

   let b1_1 = (1-t)*b01 + t*b12;
   let b2_1 = (1-t)*b12 + t*b23;

   return (1-t)*b1_1 + t*b2_1;
}

function interpolateNoise2d(x, y)
{
   x = Math.abs(x);
   y = Math.abs(y);

   let intx = Math.floor(x);
   let fractx = (x - intx);

   let inty = Math.floor(y);
   let fracty = (y - inty);

   let v1 = noise2d(intx    , inty);
   let v2 = noise2d(intx + 1, inty);
   let v3 = noise2d(intx    , inty + 1);
   let v4 = noise2d(intx + 1, inty + 1);

   let i1 = interpolate2(v1 , v2 , fractx);
   let i2 = interpolate2(v3 , v4 , fractx);

   return interpolate2(i1 , i2 , fracty) - 1;
}

function interpolateNoise3d(x, y, z)
{
   x = Math.abs(x);
   y = Math.abs(y);
   z = Math.abs(z);

   let intx = Math.floor(x);
   let fractx = (x - intx);

   let inty = Math.floor(y);
   let fracty = (y - inty);

   let intz = Math.floor(z);
   let fractz = (z - intz);

   let v1 = noise3d(intx    , inty    , intz);
   let v2 = noise3d(intx + 1, inty    , intz);
   let v3 = noise3d(intx    , inty + 1, intz);
   let v4 = noise3d(intx + 1, inty + 1, intz);

   let i1 = interpolate2(v1 , v2 , fractx);
   let i2 = interpolate2(v3 , v4 , fractx);

   let y1 = interpolate2(i1 , i2 , fracty);

   let v5 = noise3d(intx    , inty    , intz + 1);
   let v6 = noise3d(intx + 1, inty    , intz + 1);
   let v7 = noise3d(intx    , inty + 1, intz + 1);
   let v8 = noise3d(intx + 1, inty + 1, intz + 1);

   let i3 = interpolate2(v5 , v6 , fractx);
   let i4 = interpolate2(v7 , v8 , fractx);

   let y2 = interpolate2(i1 , i2 , fracty);

   return interpolate2(y1, y2, fractz);
}

// Blend levels of noise together
function Noise(x, z, numOctaves, frequency, persistence)
{
   let total = 0.0;
   let amplitude = 1.0; 
   for (let i=0; i < numOctaves; i++)
   {
      total = total + interpolateNoise2d(x * frequency, z * frequency) * amplitude;
      frequency *= 2;
      amplitude *= persistence;
   }

   return total;
}