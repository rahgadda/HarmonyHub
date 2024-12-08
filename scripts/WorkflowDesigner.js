import { Node } from "./Node.js";

export class WorkflowDesigner {
    constructor(hmhCanvas, hmhCanvasContainer,bodyStyler) {
        this.hmhCanvas = hmhCanvas;
        this.hmhCanvasContainer = hmhCanvasContainer;
        this.bodyStyler = bodyStyler;

        window.workflowDesigner = this;
        
        // Fabric.js Canvas
        this.fabricCanvas = null;
        this.isCanvasMoving = false;

        // Add canvas state variables
        this.isPanning = false;
        this.lastClientX = 0;
        this.lastClientY = 0;

        // Canvas Properties
        this.properties = this.initializeProperties();

        // Drawing Node
        this.nodes = [];
        this.selectedNode = null;
        this.hoverNode = null;

        // Connection Pointers
        this.activeConnectionPoints = null;

        // Connection State
        this.connectionState = {
            isConnecting: false,
            startNode: null,
            startPoint: null,
            tempLine: null
        };

        // Add keyboard event listener for delete
        this.setupKeyboardEvents();
    }

    initializeProperties() {
        let properties = [
            {
                name: 'API Version',
                field: 'apiVersion',
                datatype: 'Text',
                required: true,
                hint: 'Enter HarmonyHub CLI API Version',
                value: "v1",
                readOnly: true
            },
            {
                name: 'HarmonyHub Workflow Type',
                field: 'kind',
                datatype: 'Text',
                required: true,
                hint: 'Workflow Type',
                value: 'harmonyhub-workflow',
                readOnly: true
            }
        ]

        return properties;
    }

    createCanvas() {
        this.hmhCanvas.width = this.hmhCanvasContainer.clientWidth;
        this.hmhCanvas.height = this.hmhCanvasContainer.clientHeight;
        
        this.fabricCanvas = new fabric.Canvas(this.hmhCanvas, {
            backgroundColor: this.bodyStyler.getPropertyValue('--canvas-bg-color'),
            selection: true,
            preserveObjectStacking: true,
            fireRightClick: true,
            fireMiddleClick: false,
            stopContextMenu: true,
            hasBorders: false,
            hasControls: false,
            defaultCursor: 'grab',
        });
        
        // Attach canvas event handlers
        this.attachCanvasEventHandlers();
        window.dispatchEvent(new Event('resize'));
    }

    addNodeToCanvas(x, y, name, type, svg, properties) {
        try 
        {   
            // Deep clone the properties to prevent shared references
            const clonedProperties = JSON.parse(JSON.stringify(properties));

            // Create Node object        
            const node = new Node(x, y, name, type, clonedProperties);

            // Create icon using Path
            const icon = this.createFabricPathFromSVG(svg);

            // Create text element
            node.text = new fabric.Text(name, {
                fontSize: 14,
                fill: '#000000',
                originX: 'center',
                originY: 'center',
                left: node.width / 2 - 40,
                top: icon.height * icon.scaleY + 20,
                selectable: false,
                evented: false,
                hasBorders: false,
                hasControls: false
            });
    
            // Create group containing icon and text
            const group = new fabric.Group([icon, node.text], {
                left: x,
                top: y,
                width: node.width /2,
                height: node.height/2,
                hasControls: false,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                selectable: true,
                hasBorders: true,
                data: node,
                customType: 'node'
            });
    
            node.group = group;
            this.nodes.push(node);
            
            // Attach event handlers
            this.attachNodeEventHandlers(group);
            
            // Add to canvas and render
            this.fabricCanvas.add(group);
            this.fabricCanvas.renderAll();
            
            return node;
        } catch (error) {
            console.error('Error in addNodeToCanvas:', error);
            throw error;
        }
    }

    updateNodeText(node, text) {
        if (node && node.group) {
            const textElement = node.group.item(1);
            textElement.set('text', text);
            this.fabricCanvas.renderAll();
        }   
    }

    // Helper method
    // 1. Create Fabric Path Object from SVG
    createFabricPathFromSVG(svgTag) {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgTag, "image/svg+xml");
    
            if (!svgDoc || !svgDoc.documentElement) {
                console.error("Failed to parse SVG string:", svgTag);
                throw new Error("Failed to parse SVG string");
            }
    
            const svgElement = svgDoc.documentElement;
            // Try both direct path and nested path queries
            let pathElement = svgElement.querySelector('path');
            
            if (!pathElement && svgElement.tagName.toLowerCase() === 'path') {
                // Handle case where the SVG element itself is a path
                pathElement = svgElement;
            }
    
            if (!pathElement) {
                console.error("No path element found in SVG:", svgTag);
                throw new Error("SVG does not contain a path element");
            }
    
            // Extract path data
            const pathData = pathElement.getAttribute('d');
            if (!pathData) {
                throw new Error("Path element has no 'd' attribute");
            }
    
            // Extract fill color, defaulting to white if currentColor
            const fill = pathElement.getAttribute('fill') === 'currentColor' ? '#ffffff' : (pathElement.getAttribute('fill') || '#ffffff');
    
            // Extract stroke color, defaulting to black if currentColor
            const stroke = pathElement.getAttribute('stroke') === 'currentColor' ? '#000000' : (pathElement.getAttribute('stroke') || '#000000');

            // Extract stroke width
            const strokeWidth = pathElement.getAttribute('stroke-width') || 1;

            // Create fabric path with options
            return new fabric.Path(pathData, {
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                scaleX: 2,
                scaleY: 2,
                originX: 'center',
                originY: 'center'
            });
    
        } catch (error) {
            console.error('Error creating fabric path:', error);
            // Return a simple default path as fallback
            return new fabric.Path('M 0 0 L 10 10', {
                fill: '#ffffff',
                stroke: '#ff0000',
                strokeWidth: 2
            });
        }
    }

    // 2. Delete Node
    deleteSelectedNode() {
        if (this.selectedNode) {
            // Remove from canvas
            this.fabricCanvas.remove(this.selectedNode.group);
            
            // Hide connection points if visible
            this.selectedNode.hideConnectionPoints(this.fabricCanvas);
            
            // Remove connected edges
            if (this.selectedNode.edges) {
                this.selectedNode.edges.forEach(edge => edge.deleteSelectedEdge(this.fabricCanvas));
            }
            
            // Remove from nodes array
            const index = this.nodes.indexOf(this.selectedNode);
            if (index > -1) {
                this.nodes.splice(index, 1);
            }
            
            // Clear selection
            this.selectedNode = null;
            this.fabricCanvas.renderAll();
        }
    }

    // 3. Get Connection Point Co-ordinates
    getConnectionPointCoordinates(node, pointId) {
        const center = node.group.getCenterPoint();
        const point = node.connectionPoints.find(p => p.id === pointId);
        return {
            x: center.x + point.x,
            y: center.y + point.y
        };
    }

    // 4. Generate Yaml
    generateYaml() {
        let steps = [];
        let startNode = null;
        let listAllEdges = [];

        this.nodes.forEach(node => {
            if (node.edges) {
                node.edges.forEach(edge => {
                    listAllEdges.push(edge);
                });
            }
        });

        // Find the start node which is not an end node
        startNode = this.nodes.find(node => {
            const isStartNode = listAllEdges.some(edge => edge.startNode === node);
            const isEndNode = listAllEdges.some(edge => edge.endNode === node);
            return isStartNode && !isEndNode;
        });

        // console.log("Start Node", startNode);

        if (startNode) {
            // console.log("Start Node: ",startNode.getPropertyValue('name'));
            steps = this.printNodeEdges(startNode,steps);

        }else{
            console.error("No start node found");
        }  

        const yamlObject = {
            apiVersion: this.properties[0].value,
            kind: this.properties[1].value,
            workflow: {
                steps: steps
            }
        };

        const yaml = jsyaml.dump(yamlObject);
        const yamlWithCorrectedKeys = yaml.replace(/- loop:/g, '  loop:').replace(/- switch:/g, '  switch:');
        
        console.log(yamlWithCorrectedKeys);  
        return yamlWithCorrectedKeys;
    }

    printNodeEdges(node, steps, visitedNodes = new Set()) {
        if (!node || visitedNodes.has(node)) 
            return;
    
        visitedNodes.add(node);
        
        // if (node.getPropertyValue('type') !== "switch" || node.getPropertyValue('type') !== "loop") {
        //     // console.log("addYamlNode ",node.getPropertyValue('name'));
        //     this.addYamlNode(node, steps);
        // }
            
        this.addYamlNode(node, steps);

        switch(node.getPropertyValue('type')){
            case 'switch':
                const cases = {};
                if (node.edges) {
                    node.edges.forEach(edge => {
                        const caseName = "case-"+edge.endNode.getPropertyValue('id') || 'default';
                        if (node === edge.endNode) {
                            return;
                        }
                        cases[caseName] = this.printNodeEdges(edge.endNode, [], visitedNodes);
                    });
                }
                steps.push({'switch': cases});
                break;
            case 'loop':
                const loop = {};
                if (node.edges) {
                    node.edges.forEach(edge => {
                        const loopName = "loop-"+edge.endNode.getPropertyValue('id') || 'default';
                        if (node === edge.endNode) {
                            return;
                        }else{
                            loop[loopName] = []
                        } 
                        loop[loopName] = this.printNodeEdges(edge.endNode, [], visitedNodes);
                    });
                }
                steps.push({'loop':loop});
                break;
            default:
                node.edges.forEach(edge => {
                    this.printNodeEdges(edge.endNode, steps, visitedNodes);
                });
                break;
        }

        return steps;
    }

    addYamlNode(node, steps){
        const step = {};

        // console.log("Processing Node - ",node.getPropertyValue('name'));

        node.properties.forEach((prop) => {
            if(prop.value !== null && !(Array.isArray(prop.value) && prop.value.length === 0) && !(typeof prop.value === 'object' && Object.keys(prop.value).length === 0)){
                if (prop.datatype =='ArrayObject'){
                    step[prop.field] = prop.value[0];
                }
                else if(prop.datatype == 'Object'){  
                    step[prop.field] = Object.assign({}, ...prop.value);
                }
                else if(prop.field.includes('.')) {
                    const [root, subField] = prop.field.split('.');
                    step[root] = step[root] || {};
                    step[root][subField] = prop.value;
                }
                else{
                    step[prop.field] = prop.value;
                }
            }
        })

        
        steps.push(step);

        return steps;
    }

    // Event Handler
    // 1. Canvas Event Handlers
    attachCanvasEventHandlers() {
        // 1. Pan canvas when mouse is dragged
        this.fabricCanvas.on('mouse:down', (opt) => {
            
            if (!opt.target || opt.target.data?.type !== 'connection-point') {
                if (window.focusState.current === 'node') {
                    this.selectedNode = null;
                }
            }

            if (!opt.target) {
                this.isPanning = true;
                this.isCanvasMoving = true;
                this.lastClientX = opt.e.clientX;
                this.lastClientY = opt.e.clientY;
                this.fabricCanvas.setCursor('grabbing');
                this.nodes.forEach(node => node.hideConnectionPoints(this.fabricCanvas));
            }

        });

        this.fabricCanvas.on('mouse:move', (opt) => {
            if (this.isPanning && this.isCanvasMoving) {
                const deltaX = opt.e.clientX - this.lastClientX;
                const deltaY = opt.e.clientY - this.lastClientY;
                this.fabricCanvas.relativePan(new fabric.Point(deltaX, deltaY));
                this.lastClientX = opt.e.clientX;
                this.lastClientY = opt.e.clientY;
                this.fabricCanvas.setCursor('grabbing');
            }
            
            // Handle connection line drawing
            if (this.connectionState.isConnecting) {
                const pointer = this.fabricCanvas.getPointer(opt.e);
                
                if (!this.connectionState.tempLine) {
                    // Create new temporary line
                    this.connectionState.tempLine = new fabric.Line(
                        [
                            this.connectionState.startCoord.x,
                            this.connectionState.startCoord.y,
                            pointer.x,
                            pointer.y
                        ],
                        {
                            stroke: '#4CAF50',
                            strokeWidth: 2,
                            strokeDashArray: [5, 5],
                            selectable: false,
                            evented: false,
                            hasBorders: false,
                            hasControls: false
                        }
                    );
                    this.fabricCanvas.add(this.connectionState.tempLine);
                } else {
                    // Update existing line
                    this.connectionState.tempLine.set({
                        x2: pointer.x,
                        y2: pointer.y
                    });
                }
                
                this.fabricCanvas.renderAll();
            }
        });

        this.fabricCanvas.on('mouse:up', (event) => {
            this.isPanning = false;
            this.isCanvasMoving = false;
            this.fabricCanvas.setCursor('grab');

            if(event.e.button === 2) {
                console.log("right click");
            }
        });

        this.fabricCanvas.on('mouse:dblclick', (event) => {
            document.dispatchEvent(new CustomEvent('canvas-selected', { 
                detail: { canvas: this } 
            }));
        });

        // 2. Zoom canvas when mouse wheel is scrolled
        this.fabricCanvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.fabricCanvas.getZoom();
            
            if (delta < 0) {
                zoom *= 1.05;
                this.fabricCanvas.setCursor('zoom-in');
            } else {
                zoom *= 0.95;
                this.fabricCanvas.setCursor('zoom-out');
            }
            
            zoom = Math.min(Math.max(zoom, 0.1), 5);
            
            this.fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // 3. Resize canvas when window is resized
        window.addEventListener('resize', () => {
            this.hmhCanvas.width = this.hmhCanvasContainer.clientWidth;
            this.hmhCanvas.height = this.hmhCanvasContainer.clientHeight;
            this.fabricCanvas.setWidth(this.hmhCanvasContainer.clientWidth);
            this.fabricCanvas.setHeight(this.hmhCanvasContainer.clientHeight);
        });
    }

    // 2. Node Event Handlers
    attachNodeEventHandlers(nodeGroup) {
        let isDragging = false;
        
        nodeGroup.on({
            'moving': (e) => {
    
                const node = e.transform.target.data;
                if (!node) return;

                // Set moving flag
                this.isCanvasMoving = false;
                node.isMoving = true;

                // Update position
                node.x = nodeGroup.left;
                node.y = nodeGroup.top;
    
                // Hide connection points during movement
                node.hideConnectionPoints(this.fabricCanvas);          
    
                // Update connected edges
                if (node && node.edges) {
                    node.edges.forEach(edge => {
                        edge.deleteSelectedEdgeGroup(this.fabricCanvas);
                        edge.createEdge(this.fabricCanvas)
                    });
                }
    
                this.fabricCanvas.renderAll();
            },
            'mousedown': (e) => {
                if (!this.isCanvasMoving) {

                    isDragging = true;
                    const node = e.target?.data;
                    if (node) {
                        this.selectedNode = node;
                        node.isMoving = true;
                        node.hideConnectionPoints(this.fabricCanvas);
                    }
                    nodeGroup.hoverCursor = 'move';
                }
            },
            'mouseup': (e) => {
                isDragging = false;
                nodeGroup.hoverCursor = 'pointer';
                
                const node = e.target?.data;
                if (node) {
                    node.isMoving = false;
                    // Show points only on click when not moving canvas
                    if (!this.isCanvasMoving && e.e.button === 0) {
                        node.showConnectionPoints(this.fabricCanvas);
                    }
                }
            },
            'selected': (e) => {
                document.dispatchEvent(new CustomEvent('node-selected', { 
                    detail: { node: e.target?.data } 
                }));
            }
        });
    }

    // 3. Delete Button Event Handler
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
        
            if (e.key === 'Delete' && !window.focusState.onPropertyPallet && window.focusState.current === 'node') {
                
                this.deleteSelectedNode();
                    document.dispatchEvent(new CustomEvent('deleted-attribute',{
                    detail: {canvas : this}
                }));

            }else if (e.key === 'Delete' && !window.focusState.onPropertyPallet && window.focusState.current === 'edge') {
                
                window.focusState.selectedEdge.deleteSelectedEdge(this.fabricCanvas);
                    document.dispatchEvent(new CustomEvent('deleted-attribute',{
                    detail: {canvas : this}
                }));
            }
            else if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                const yaml = this.generateYaml();

                // console.log(yaml);
                
                // Dispatch event with YAML content
                document.dispatchEvent(new CustomEvent('show-yaml', {
                    detail: { yaml }
                }));
            }
            if(e.key === 'Escape' && this.connectionState.isConnecting) {
                if (this.connectionState.tempLine) {
                    this.fabricCanvas.remove(this.connectionState.tempLine);
                    this.connectionState.tempLine = null;
                    this.connectionState.isConnecting = false;
                    this.connectionState.startNode = null;
                    this.connectionState.startPoint = null;
                }
            }
        });
    }
}