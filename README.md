# ⬡ Games and Algorithms: AI Algorithm Explorer

An interactive web application designed to visualize and explore foundational AI algorithms. Built with a focus on educational clarity and premium UI/UX, this suite allows users to interact with state-space search, constraint satisfaction, and game-playing agents in real-time.

---

## 🚀 Key Features

- **Interactive Visualizations**: Real-time feedback and step-by-step animations for complex algorithms.
- **Educational Theory Panels**: Integrated explanations of State Space, Transition Models, and Heuristics for each module.
- **Modern Dashboard**: A sleek, responsive interface to switch between different AI domains.
- **Performance Focused**: Built using vanilla web technologies for a smooth, lag-free experience.

---

## 🧩 Core Modules

### 🗺️ Pathfinder (A*)
Visualize the classic **A* Search algorithm** on a 20×20 grid.
- **Interactivity**: Draw walls, drag Start/End nodes, and watch the optimal path form.
- **Algorithm**: Uses Manhattan Distance as an admissible heuristic.
- **State Space**: Up to 400 grid cells representing reachable states.

### 🎨 Map Coloring (CSP)
Solve a **Constraint Satisfaction Problem** on a connected map of 6 regions.
- **Interactivity**: Pick a color for any region; the AI solves the rest using Backtracking + Forward Checking.
- **Algorithm**: Recursive Backtracking with pruning for efficiency.
- **Constraints**: Binary constraints ensure no adjacent regions share the same color.

### ♟️ Checkers AI (Minimax)
Play against an intelligent agent in a standard game of **Checkers**.
- **Interactivity**: Human vs. AI gameplay with valid move highlighting and piece capturing.
- **Algorithm**: Powered by Minimax with **Alpha-Beta Pruning** to search the game tree efficiently.
- **Evaluation**: Heuristic based on piece differential and King status.

### 🗼 Tower of Hanoi (Recursive)
Watch the optimal recursive solution to the **Tower of Hanoi** puzzle.
- **Interactivity**: Adjust number of disks (3-5) and animation speed.
- **Algorithm**: Demonstrates recursive state-space search and optimal move sequences.
- **Complexity**: Shows the exponential growth of moves ($2^N - 1$).

---

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5
- **Styling**: Modern Vanilla CSS3 (Custom properties, Flexbox, Grid)
- **Logic**: Vanilla JavaScript (ES6 Modules, Canvas API, SVG)

---

## 🏁 Getting Started

1. **Clone/Download** the repository.
2. **Open `index.html`** in any modern web browser.
3. *Optional*: Use a local development server (like VS Code Live Server) for the best experience with JS modules.

---

## 📂 Project Structure

```text
.
├── index.html          # Main application entry point
├── app.js              # Module controller and navigation logic
├── style.css           # Global styles and design system
└── modules/            # AI Algorithm implementations
    ├── pathfinder.js   # A* Search logic
    ├── map_coloring.js # CSP Backtracking logic
    ├── checkers.js     # Minimax and game logic
    └── hanoi.js        # Recursive search and animation
```

---

*Created for educational purposes and college seminar presentations.*
