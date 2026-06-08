/* HUMAN TASKS:
1. Ensure postcss v8.4.0 is installed
2. Ensure tailwindcss v3.3.0 is installed
3. Ensure autoprefixer v10.4.0 is installed
4. Verify that the tailwind.config.js file is properly configured
5. Ensure your build process includes PostCSS processing */

// postcss v8.4.0
// tailwindcss v3.3.0
// autoprefixer v10.4.0

// Requirement: Frontend Stack - UI Components
// Integrates Tailwind CSS for consistent UI styling and Material Design implementation
// Requirement: Web Dashboard
// Configures CSS processing pipeline for optimal web dashboard styling
// Requirement: Performance Optimization
// Implements CSS processing optimizations through PostCSS plugins
// Requirement: Mobile-first Design
// Ensures proper CSS processing for responsive design through autoprefixer

// Next.js requires PostCSS plugins to be declared by name (string keys), NOT as
// `require(...)` function references. Passing functions triggers Next's
// "Malformed PostCSS Configuration / A PostCSS Plugin was passed as a function using
// require()" error and 500s every page. Use the canonical object form so Next's
// built-in CSS pipeline (now responsible for globals.css/@tailwind after the custom
// scss webpack rule was removed) can resolve the plugins itself.
module.exports = {
  plugins: {
    // Core Tailwind CSS processing for utility-first CSS framework
    tailwindcss: {},

    // Automatic vendor prefix addition for cross-browser compatibility
    autoprefixer: {}
  }
};