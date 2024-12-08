// Variable to track which Window is currently in focus. Default is canvas.

window.nodeId = 1;

window.focusState = {
    current: 'canvas', // Default focus on canvas
    previous: null,
    selectedNode: null,
    selectedEdge: null,
    selectedCanvas: null,
    onPropertyPallet: false
};

window.getNextNodeId = () => {
    return window.nodeId++;
};

