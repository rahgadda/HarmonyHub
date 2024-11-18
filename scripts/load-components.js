// Array of component script files
const componentFiles = [
    '../components/app-header/app-header.js',
    '../components/app-footer/app-footer.js',
    '../components/app-hamburger/app-hamburger.js',
    '../components/app-main/app-main.js',
    '../components/app-tools/app-tools.js',
    '../components/app-properties/app-properties.js',
    '../components/app-canvas/app-canvas.js',
    '../components/app-yaml/app-yaml.js',
    '../components/app-accordion/app-accordion.js'
];

// Dynamically import each component file
componentFiles.forEach(file => {
    import(file).catch(error => {
        console.error(`Failed to load component: ${file}`, error);
    });
});