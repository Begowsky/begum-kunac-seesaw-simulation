# A SIMPLE SEESAW SIMULATION - BEGÜM KUNAÇ
This project is an interactive seesaw simulation where users can click anywhere on the seesaw plank to drop random-weighted (1-10 kg) objects, torque with respect to the center is calculated, and the seesaw tilts according to the calculations. It is written using HTML, CSS, and pure JavaScript. 

Live demo: https://begowsky.github.io/begum-kunac-seesaw-simulation/

# THOUGHT PROCESS & DESIGN DECISIONS
1. I approached the project in incremental steps. I started with the core problem, which is creating the seesaw plank balanced at the center, weight objects, and the calculation of the torque = weight x distance. The difference between left and right torques determines the tilt angle.
2. To drop objects exactly where the user clicks, client X is not enough, since the plank rotates, and this was a challenge for me. I solved this by rotating the click coordinates onto the plank axis.
3. I added pause and reset functionality for better control.
4. I stored the simulation's full state so that refreshing the page restores the progress.
5. To provide a smooth motion, I implemented a spring-damper model (stiffness, damping, requestAnimationFrame).
6. I updated the features of weight objects, such as sizes proportional to their weights, the shape choice (circle or square), the color (distinct per weight), and their distance from the plank's center is shown to the user at the bottom of the page and the logs.
7. I had to make positional fixes and pivot shapings a couple of times to ensure a good and realistic design. 
8. I added features such as pause, reset, undo/redo, hover distance indicator, activity logs, and parameters such as seesaw length, speed, and object shapes, considering what users might expect to see in a seesaw simulation.
9. I did bug and logical fixes after each step and continue adding more functionality to the simulation.
10. Lastly, I added sound effects, which users can hear when the weight object hits the seesaw plank (a heavier object makes a lower-pitched sound) in the simulation.

# TRADE OFFS & LIMITATIONS
1. There is no collision detection between the weight objects. If the user clicks multiple times on the same position, the objects visually overlap rather than stacking on top of each other. This was an intentional simplification, since implementing proper collision physics would require tracking vertical height layers and calculating object-object interactions.
2. Undo/redo functionality requires holding the history of full snapshots (all objects, their positions, angle, next weight, logs, parameters) for implementation simplicity, but a long simulation would result in a long snapshot list where the snapshot saves many objects, and this is not very memory-efficient. Difference-based history would reduce storage size, but would also make the logic more complex. Given the scope of the project, I prioritized clarity, correctness, and simplicity over memory optimization.

# AI ASSISTANCE
I used ChatGPT for minor help, such as debugging specific syntax issues in JavaScript, fixing projection math mistakes, getting help structuring the undo/redo snapshot logic, and checking bugs when integrating localStorage.

# PROJECT STRUCTURE
begum-kunac-seesaw-simulation
  index.html
  style.css
  script.js
  README.md
  thud.mp3


