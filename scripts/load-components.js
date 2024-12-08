// Array of component script files
const componentFiles = [
    '../components/hmh-hamburger/hmh-hamburger.js',
    '../components/hmh-canvas-container/hmh-canvas-container.js',
    '../components/hmh-tool-search/hmh-tool-search.js',
    '../components/hmh-accordion/hmh-accordion.js',
    '../components/hmh-tools/hmh-tools.js',
    '../components/hmh-properties/hmh-properties.js',
    '../components/hmh-viewyaml/hmh-viewyaml.js',
    '../components/hmh-main/hmh-main.js',
    '../components/hmh-footer/hmh-footer.js',
];

// Dynamically import each component file
componentFiles.forEach(file => {
    import(file).catch(error => {
        console.error(`Failed to load component: ${file}`, error);
    });
});