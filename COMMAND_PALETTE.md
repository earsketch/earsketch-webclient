# Command Palette

The EarSketch Command Palette is a universal search interface similar to VS Code's Command Palette, providing quick access to scripts, sounds, API functions, curriculum content, and application commands.

## Opening the Command Palette

- **Keyboard Shortcut**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- The command palette will appear as an overlay at the top of the screen

## Features

### Universal Search
Search across multiple categories of content:

- **Scripts**: Your saved scripts and shared scripts
- **Sounds**: Standard EarSketch sounds and your uploaded sounds
- **API Functions**: EarSketch API functions (fitMedia, setTempo, makeBeat, etc.)
- **Curriculum**: Educational content and tutorials
- **Commands**: Application commands and shortcuts

### Categories

#### Scripts
- Search through all your scripts by name or creator
- Click to open a script in the editor
- Includes both regular and shared scripts

#### Sounds
- Search through the entire sound library
- Filter by artist, genre, instrument, or sound name
- Click to insert the sound name into the active editor
- Includes both standard EarSketch sounds and user-uploaded sounds

#### API Functions
- Browse all available EarSketch API functions
- Click to insert function name with parentheses into the editor
- Cursor is automatically positioned inside the parentheses for parameter entry

#### Curriculum
- Search through educational content and tutorials
- Click to navigate directly to relevant curriculum sections
- Helpful for finding specific topics while coding

#### Commands
Available commands include:
- **New Script**: Create a new Python or JavaScript script
- **Save Script**: Save the current script
- **Run Script**: Execute the current script
- **Share Script**: Share the current script with others (logged in users)
- **Download Script**: Download the current script (logged in users)
- **Script History**: View version history (logged in users)
- **Script Analysis**: Analyze current script complexity
- **Upload Sound**: Upload a new sound file (logged in users)
- **Toggle Theme**: Switch between light and dark themes
- **Start Quick Tour**: Begin the interactive tutorial
- **Edit Profile**: Edit user profile (logged in users)
- **Create Account**: Sign up for EarSketch (anonymous users)
- **Forgot Password**: Reset password (anonymous users)
- **Admin Window**: Access admin panel (admin users only)

### Search Tips

- Use partial names or keywords to find what you're looking for
- Search is case-insensitive
- Results are grouped by category for easy browsing
- Use keyboard arrows to navigate through results
- Press Enter to execute the selected item
- Press Escape to close the command palette

## Implementation Details

The command palette is implemented as a React component using:
- **Headless UI** for accessible dialog and combobox components
- **Redux** for state management and data access
- **React i18n** for internationalization support
- **Tailwind CSS** for styling

### Performance Optimizations
- **Lazy Loading**: Commands are only generated when the user starts typing
- **Result Limiting**: Only the top 20 most relevant results are displayed
- **Efficient Filtering**: Search filtering happens during command generation, not as a separate step
- **Sound Library Limiting**: Only checks the first 50 sounds to prevent performance issues

### Keyboard Integration
- The keyboard shortcut `Cmd+Shift+P`/`Ctrl+Shift+P` is registered in the main App component
- Escape key closes the palette
- Arrow keys navigate through results
- Enter key executes the selected command

### Dynamic Content
The command palette dynamically updates its content based on:
- User authentication status
- Available scripts and sounds
- Current editor context
- User permissions (admin features)

### Architecture Notes
- The keyboard shortcut listener is implemented in the main App component to ensure it's always active
- The CommandPalette component handles the UI and search functionality
- State management is done through React local state for the palette open/close status
- Commands are only computed when there's a search query, preventing initial rendering bottlenecks

This feature enhances productivity by providing quick access to all EarSketch functionality through a single, searchable interface while maintaining optimal performance.