# Planning Guide

An interactive Docker playground that simulates Docker concepts and commands to help users learn containerization fundamentals through hands-on experimentation.

**Experience Qualities**:
1. **Educational** - Clear visualizations and explanations help users understand complex Docker concepts through interactive experimentation
2. **Experimental** - A safe sandbox environment where users can try commands, make mistakes, and learn without consequences
3. **Visual** - Container states, image layers, and system architecture are represented graphically to demystify abstract concepts

**Complexity Level**: Light Application (multiple features with basic state)
- The app provides multiple interactive features (command terminal, container visualization, image management) with state management for containers and images, but doesn't require complex routing or advanced data structures.

## Essential Features

**Interactive Command Terminal**
- Functionality: Simulates Docker CLI commands (run, ps, images, stop, rm, etc.)
- Purpose: Allows users to practice Docker commands in a safe environment without actual Docker installation
- Trigger: User types commands in the terminal input
- Progression: User types command → Parser validates syntax → System executes simulated command → Visual feedback shows state changes → Output displays in terminal
- Success criteria: Commands parse correctly, state updates appropriately, and clear feedback is provided for both valid and invalid commands

**Interactive Tutorial System**
- Functionality: Step-by-step guided tutorials teaching Docker workflows with validation and hints
- Purpose: Provides structured learning paths for beginners through advanced users with real-time feedback
- Trigger: User clicks "Tutorials" button to browse available tutorials, then starts one
- Progression: Browse tutorials → Select difficulty level → Start tutorial → Follow step instructions → Execute commands → Receive validation → Progress to next step → Complete tutorial
- Success criteria: Tutorial panel shows current step clearly, validates commands accurately, provides helpful hints, tracks progress persistently, and celebrates completion

**Container Visualization**
- Functionality: Visual representation of running containers with their status, ports, and resource usage
- Purpose: Helps users understand what happens when containers are created, started, stopped, and removed
- Trigger: Automatically updates when container state changes
- Progression: Container created → Card appears with details → Status indicators show running/stopped state → User can interact to stop/start/remove
- Success criteria: All containers are visually represented with accurate states, and visual updates happen immediately after commands

**Image Management**
- Functionality: Display available Docker images with tags, sizes, and layer information
- Purpose: Teaches users about images, layers, and the relationship between images and containers
- Trigger: User executes image-related commands or views the images panel
- Progression: Images list displayed → User selects image → Layer details shown → User can pull/remove images → Containers can be created from images
- Success criteria: Image library is browsable, layer information is educational, and relationship to containers is clear

**Command Reference Guide**
- Functionality: Built-in documentation of supported Docker commands with examples
- Purpose: Provides learning scaffolding and reduces friction when exploring new commands
- Trigger: User clicks help button or types 'help' command
- Progression: User requests help → Dialog/panel opens → Commands listed with syntax and examples → User can copy examples to try
- Success criteria: All supported commands are documented with clear examples and explanations

## Edge Case Handling

- **Invalid Commands**: Display helpful error messages that guide users toward correct syntax with suggestions
- **Duplicate Container Names**: Prevent creation and suggest using unique names or auto-generate names
- **Missing Images**: When trying to run a container from non-existent image, prompt to pull the image first
- **Port Conflicts**: Show warning when attempting to use already-bound ports
- **Stopped Container Actions**: Prevent operations on stopped containers that require running state with clear messaging
- **Empty States**: Show helpful guidance when no containers or images exist yet
- **Tutorial Progress**: Persist tutorial progress across sessions so users can resume where they left off
- **Wrong Tutorial Command**: When user types valid Docker command but not the one tutorial expects, acknowledge it works but guide them back to tutorial path
- **Tutorial State Validation**: Use both command matching and state validation to ensure tutorial steps are properly completed

## Design Direction

The design should evoke a developer-tool aesthetic that feels both technical and approachable - like a modern IDE or terminal interface but with vibrant, friendly touches that make learning feel engaging rather than intimidating.

## Color Selection

A technical yet vibrant color scheme inspired by syntax highlighting and terminal interfaces.

- **Primary Color**: Deep Cyan (oklch(0.55 0.15 210)) - Represents containers and Docker's brand identity, communicates technical precision and reliability
- **Secondary Colors**: 
  - Dark Slate (oklch(0.25 0.02 240)) - Terminal backgrounds and code blocks for authenticity
  - Steel Blue (oklch(0.65 0.08 240)) - Secondary UI elements and inactive states
- **Accent Color**: Electric Green (oklch(0.75 0.18 145)) - Success states, running containers, and interactive elements that demand attention
- **Foreground/Background Pairings**: 
  - Background Dark (oklch(0.15 0.02 240)): Light Text (oklch(0.95 0.01 240)) - Ratio 12.8:1 ✓
  - Primary Cyan (oklch(0.55 0.15 210)): White Text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Accent Green (oklch(0.75 0.18 145)): Dark Text (oklch(0.15 0.02 240)) - Ratio 11.5:1 ✓
  - Card Background (oklch(0.20 0.02 240)): Light Text (oklch(0.95 0.01 240)) - Ratio 10.5:1 ✓

## Font Selection

Monospace fonts for authenticity and technical credibility, paired with a clean geometric sans for UI elements.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold/32px/tight tracking
  - H2 (Section Headers): Space Grotesk Semibold/24px/normal tracking
  - Body (UI Text): Space Grotesk Regular/16px/normal tracking
  - Terminal Text: JetBrains Mono Regular/14px/normal tracking with subtle letter spacing
  - Command Output: JetBrains Mono Regular/13px/relaxed line height
  - Monospace everywhere: JetBrains Mono for all code, commands, and technical output

## Animations

Animations should feel technical and precise - like watching a well-engineered system at work - with smooth state transitions that help users understand cause and effect.

- Container appearance/removal: Scale and fade with slight bounce (300ms) to emphasize creation/destruction
- Status changes: Color pulse with icon rotation (200ms) for starting/stopping states
- Terminal output: Smooth scroll with slight fade-in (150ms) for each new line
- Command execution: Brief loading indicator with success checkmark animation
- Panel transitions: Smooth slide and fade (250ms) when switching between views

## Component Selection

- **Components**: 
  - Card component for container and image displays with custom dark styling
  - Tabs for switching between Containers/Images/Help views
  - ScrollArea for terminal output and long lists
  - Dialog for detailed container/image information and help documentation
  - Badge for status indicators (running, stopped, exited) with custom color variants
  - Button with icon combinations for all actions, styled with hover states
  - Input for terminal command entry with monospace font and focus states
  - Separator for visual organization between sections
  - Tooltip for hover explanations on technical terms
  
- **Customizations**: 
  - Terminal component with syntax highlighting for Docker commands
  - Container card with real-time status indicators and action buttons
  - Image layer visualization showing the layered filesystem concept
  - Command parser component that validates and executes simulated Docker commands
  
- **States**: 
  - Buttons: Distinct hover (brightness increase), active (scale down), disabled (opacity 50%)
  - Input: Focus ring in primary cyan with glow effect, error state in red
  - Containers: Visual distinction between running (green accent), stopped (muted), and transitioning states
  - Terminal: Active command line with blinking cursor, success/error output with color coding
  
- **Icon Selection**: 
  - Phosphor icons throughout - Play/Stop for container control, Trash for removal, Download for pulling images, Terminal for command interface, Cube for containers, Stack for images, Question for help
  
- **Spacing**: 
  - Consistent 4-unit (1rem) gaps between major sections
  - 2-unit (0.5rem) padding inside cards
  - 6-unit (1.5rem) padding for main container
  - 1-unit (0.25rem) gaps for inline elements and badges
  
- **Mobile**: 
  - Stack terminal above visualization on mobile
  - Full-width cards for containers/images
  - Collapsible command reference that slides up from bottom
  - Larger touch targets (44px minimum) for all interactive elements
  - Single column layout with priority given to terminal interface
