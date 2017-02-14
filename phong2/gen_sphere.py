from math import * 
rings = 10
radius = 1.0
span = 10
pos = [0, radius, 0]
for i in range(rings, -1, -1):
	y = ((i*1.0)/rings) * radius # Ranges from 0 to radius
	a = ((radius**2) - (y**2))**0.5 #rad at this level
	for j in range(span):
		deg = 2*pi * ((j*1.0)/span) 
		x = cos(deg) * a
		z = sin(deg) * a
		pos.extend([x,y,z])
for i in range(1, (-1 * rings) - 1, -1):
	y = ((i*1.0)/rings) * radius # Ranges from 0 to radius
	a = ((radius**2) - (y**2))**0.5 #rad at this level
	for j in range(span):
		deg = 2*pi * ((j*1.0)/span) 
		x = cos(deg) * a
		z = sin(deg) * a
		pos.extend([x,y,z])
pos.extend([0, -1 * radius, 0])
print pos

