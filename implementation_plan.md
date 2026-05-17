# 🏗️ Doodledo -> VibeRoom Transformation Plan

This plan details the migration of the single-card Doodledo app into the immersive 3-column VibeRoom dashboard.

## 🛠️ Step 1: Layout & Style Migration
- **[MODIFY] index.html**: Replace the current single-card structure with the 3-column `#app` layout (Sidebar, Center, Planner).
- **[MODIFY] style.css**: Replace all styles with the high-end glassmorphism and grid-based styles from the VibeRoom template.

## 🧠 Step 2: Logic & Feature Migration
- **[MODIFY] script.js**: 
  - Implement the `state` management system.
  - Add the `VIBES` and `QUOTES` data arrays.
  - Upgrade the `addTask` system to handle tags and pomodoros.
  - Implement the `Canvas` animation engine for background vibes.
  - Build the Web Audio ambient sound controller.

## 🎨 Phase 3: Fine-Tuning
- Ensure the existing tasks in `localStorage` are compatible or migrated.
- Polish the "Schedule" and "Log" tab transitions.

## 🧪 Verification Plan
### Manual Verification
- Check if the 3-column layout is responsive.
- Verify that clicking different "Vibes" changes the background, accent colors, and music.
- Test the Pomodoro timer's link to the selected focus task.
