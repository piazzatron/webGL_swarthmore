tick():
	computeDensity
	calculateAccelerations
	updateVeloAndPosition
	calculateAcceleration

	Birdson - Fluid Simulation (book)
    Baroff + Witkins (numerical integration, less important, about taylor series & leapfrog)

Consider putting caps on acceleration

    calculateAccelerations:
        reset to 0
        add gravity
        add collision forces
        add interaction forces
            pressure
            viscosity 

    For constants:
        Keep neighborhood small (2 or 3 other particles)
        You can comptute rho_0 based on the starting density
        Visualize density as color

        Order:
            Density
            Gravity/Collision forces
            Interaction forces: pressure/viscosity

        Try 100 particles to start
            10 for implementing/debugging
            try initializing as a grid

        Implement forces 1 at a time