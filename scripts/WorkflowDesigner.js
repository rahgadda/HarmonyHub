import { Node } from "./Node.js";
import { loadTools } from './load-tools.js';

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

        // Load tools
        loadTools().then(tools => {
            this.tools = tools;
        }).catch(error => {
            console.error('Error loading tools:', error);
        });
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
            },
            {
                name: 'Name',
                field: 'name',
                datatype: 'Text',
                required: true,
                hint: 'Workflow Name',
                value: 'demo',
                readOnly: false
            },
            {
                name: 'Description',
                field: 'description',
                datatype: 'Text',
                required: true,
                hint: 'Workflow Description',
                value: 'Demo Workflow',
                readOnly: false
            },
            {
                name: 'SVG Icon',
                field: 'svg',
                datatype: 'TextLarge',
                required: false,
                hint: 'SVG Icon',
                value: '',
                readOnly: false
            },
            {
                name: 'Headers',
                field: 'headers',
                datatype: 'Object',
                required: false,
                hint: 'Enter Global Headers {}',
                value: {},
                readOnly: false
            },
            {
                name: 'Variables',
                field: 'variables',
                datatype: 'Object',
                required: false,
                hint: 'Enter Global Variables {}',
                value: {}
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
            let icon = null;
            let text = null;

            // Create icon using Path
            [icon,text] = this.createFabricPathFromSVG(svg, name, node);
            node.text = text;
    
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
            
            // console.log("Node added:", node.getPropertyValue('name'));

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

    addIntegrationNodeToCanvas(x, y, name, type, svg, tool) {
        try{

            let properties = [
                {
                    name: 'Tool Id',
                    field: 'toolid',
                    datatype: 'Text',
                    required: true,
                    hint: 'Enter Integration Tool ID',
                    value: tool.id,
                    readOnly: true
                },
                {
                    name: 'Name',
                    field: 'name',
                    datatype: 'Text',
                    required: 'true',
                    hint: 'Enter value for Name',
                    value: name,
                    readOnly: false
                }
            ]

            const variableProperty = tool.properties.find(prop => prop.field === 'variables');
            if (variableProperty && variableProperty.value) {
                for (let variable in variableProperty.value) {
                    let var_name = variable.charAt(0).toUpperCase() + variable.slice(1)
                    var_name = var_name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())

                    properties.push({
                        name: var_name,
                        field: variable,
                        datatype: 'Text',
                        required: false,
                        hint: `Enter value for ${var_name}`,
                        value: variableProperty.value[variable],
                        readOnly: false
                    });
                }
            }

            let node = this.addNodeToCanvas(x, y, name, type, svg, properties)
            node.png = tool.png;
            node.group.customType = 'integration';

            // console.log("Integration Node added:", node);

            return node;
        }
        catch (error) {
            console.error('Error in addIntegrationNodeToCanvas:', error);
            throw error;
        }
    }

    canvasToPNG(fabricCanvas) {
        // Remove selection borders
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
        
        // Get coordinates of content
        const objects = fabricCanvas.getObjects();
        if (!objects.length) return null;
        
        // Find boundaries of all objects
        const bounds = objects.reduce((acc, obj) => {
            const bound = obj.getBoundingRect();
            return {
                left: Math.min(acc.left, bound.left),
                top: Math.min(acc.top, bound.top),
                right: Math.max(acc.right, bound.left + bound.width),
                bottom: Math.max(acc.bottom, bound.top + bound.height)
            };
        }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        
        // Add small padding
        const padding = 10;
        bounds.left = Math.max(0, bounds.left - padding);
        bounds.top = Math.max(0, bounds.top - padding);
        bounds.right = Math.min(fabricCanvas.width, bounds.right + padding);
        bounds.bottom = Math.min(fabricCanvas.height, bounds.bottom + padding);
        
        // Get base64 of trimmed area
        return fabricCanvas.toDataURL({
            format: 'png',
            quality: 1,
            left: bounds.left,
            top: bounds.top,
            width: bounds.right - bounds.left,
            height: bounds.bottom - bounds.top
        }).replace(/^data:image\/png;base64,/, '');
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
    createFabricPathFromSVG(svgTag, name, node) {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgTag, "image/svg+xml");
            let fabricText = null;
            let fabricIcon = null;
    
            if (!svgDoc || !svgDoc.documentElement) {
                console.error("Failed to parse SVG string:", svgTag);
                throw new Error("Failed to parse SVG string");
            }
    
            const svgElement = svgDoc.documentElement;
            const pathElement = svgElement.querySelector('path');
            const textElement = svgElement.querySelector('text');
    
            // Handle text element
            if (textElement) {
                const text = textElement.textContent;
                const fontSize = textElement.getAttribute('font-size') || 10;
                const fontWeight = textElement.getAttribute('font-weight') || 'normal';
                const fill = textElement.getAttribute('fill') === 'currentColor' ? '#ffffff' : (textElement.getAttribute('fill') || '#ffffff');
    
                fabricIcon = new fabric.Text(text, {
                    fontSize: parseInt(fontSize),
                    fontWeight: fontWeight,
                    fill: fill,
                    originX: 'center',
                    originY: 'center',
                    scaleX: 2,
                    scaleY: 2
                });

                fabricText = new fabric.Text(name, {
                    fontSize: 14,
                    fill: '#000000',
                    originX: 'center',
                    originY: 'center',
                    left: node.width / 2 - 40,
                    top: fabricIcon.height * fabricIcon.scaleY-40,
                    selectable: false,
                    evented: false,
                    hasBorders: false,
                    hasControls: false
                });

                return [fabricIcon,fabricText];
            }
    
            // Handle path element
            if (pathElement || svgElement.tagName.toLowerCase() === 'path') {
                const element = pathElement || svgElement;
                const pathData = element.getAttribute('d');
                
                if (!pathData) {
                    throw new Error("Path element has no 'd' attribute");
                }
    
                const fill = element.getAttribute('fill') === 'currentColor' ? '#ffffff' : (element.getAttribute('fill') || '#ffffff');
                const stroke = element.getAttribute('stroke') === 'currentColor' ? '#000000' : (element.getAttribute('stroke') || '#000000');
                const strokeWidth = element.getAttribute('stroke-width') || 1;
    
                fabricIcon = new fabric.Path(pathData, {
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    scaleX: 2,
                    scaleY: 2,
                    originX: 'center',
                    originY: 'center'
                });

                fabricText = new fabric.Text(name, {
                    fontSize: 14,
                    fill: '#000000',
                    originX: 'center',
                    originY: 'center',
                    left: node.width / 2 - 40,
                    top: fabricIcon.height * fabricIcon.scaleY + 20,
                    selectable: false,
                    evented: false,
                    hasBorders: false,
                    hasControls: false
                });

                return [fabricIcon,fabricText];
            }
    
            throw new Error("SVG contains neither path nor text element");
    
        } catch (error) {
            console.error('Error creating fabric object:', error);
            // Return default text as fallback
            return new fabric.Text('?', {
                fill: '#ffffff',
                fontSize: 20,
                originX: 'center',
                originY: 'center'
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
                // console.log("Edges: ", this.selectedNode.edges);
                this.selectedNode.edges.forEach( edge => {
                    // console.log("Edge: ", edge.endNode.getPropertyValue('id'));
                    edge.deleteSelectedEdge(this.fabricCanvas)
                });
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
        if (this.nodes.length === 1) {
            startNode = this.nodes[0];
        }else{
            startNode = this.nodes.find(node => {
                const isStartNode = listAllEdges.some(edge => edge.startNode === node);
                const isEndNode = listAllEdges.some(edge => edge.endNode === node);
                return isStartNode && !isEndNode;
            });
        }

        // console.log("Start Node", startNode);

        if (startNode) {
            // console.log("Start Node: ",startNode.getPropertyValue('name'));
            steps = this.printNodeEdges(startNode,steps);

        }else{
            throw new Error("No start node found");
        }  

        const yamlObject = {
            apiVersion: this.properties[0].value,
            kind: this.properties[1].value,
            name: this.properties[2].value,
            description: this.properties[3].value,
            svg: this.properties[4].value ? String.raw`${this.properties[4].value}` : undefined,
            png: this.canvasToPNG(this.fabricCanvas),
            headers: Object.keys(this.properties[5].value).length ? this.properties[5].value : undefined,
            variables: Object.keys(this.properties[6].value).length ? this.properties[6].value : undefined,
            workflow: {
            steps: steps
            }
        };
            
        for (let key in yamlObject) {
            if (yamlObject[key] === undefined) {
                delete yamlObject[key];
            }
        }

        const yaml = jsyaml.dump(yamlObject);
        const yamlWithCorrectedKeys = yaml.replace(/- iterations:/g, '  iterations:')
                                          .replace(/- cases:/g, '  cases:')
                                          .replace(/- errorhandler:/g, '  errorhandler:')
                                        //   .replace(/- condition:(.*)/g, '  condition:$1');
        
        // console.log(yamlWithCorrectedKeys);  
        return yamlWithCorrectedKeys;
    }

    printNodeEdges(node, steps, visitedNodes = new Set()) {
        if (!node || visitedNodes.has(node)) 
            return;
    
        visitedNodes.add(node);
        
        this.addYamlNode(node, steps);
        
        switch(node.getPropertyValue('type')){
            case 'switch':
                const switchCases = [];
                if (node.edges) {
                    node.edges.forEach(edge => {
                        if (node === edge.endNode) return;
                        
                        const caseSteps = [];
                        this.printNodeEdges(edge.endNode, caseSteps, visitedNodes);
                        const caseKey = {
                            name:`case-${edge.endNode.getPropertyValue('id')}`,
                            condition: edge.getPropertyValue('expression'),
                            steps: caseSteps
                        };
                        
                        if (caseSteps.length > 0) {
                            if (edge.getPropertyValue('expression') === null || edge.getPropertyValue('expression') === '') {
                                throw new Error(`Required field expression in the edge of Decision NodeID ${node.getPropertyValue("id")}`);
                            } else {
                                switchCases.push(caseKey);
                            }
                        }
                    });
                }
                steps.push({'cases': switchCases});
                break;
            case 'errorhandler':
                const errorBlocks = [];
                let foundTryBlock = false;
                let foundCatchBlock = false;

                if (node.edges) {
                    node.edges.forEach(edge => {
                        if (node === edge.endNode) return;

                        const errorSteps = [];
                        this.printNodeEdges(edge.endNode, errorSteps, visitedNodes);
                        const errorKey = {
                            name:edge.getPropertyValue('name'),
                            condition: edge.getPropertyValue('name') === 'catch' ? edge.getPropertyValue('expression') : undefined,
                            steps: errorSteps
                        };

                        if (errorSteps.length > 0) {

                            if (edge.getPropertyValue('name') === 'try') {
                                foundTryBlock = true;
                            }
                            if (edge.getPropertyValue('name') === 'catch') {
                                foundCatchBlock = true;
                            }

                            if (edge.getPropertyValue('name') === null || edge.getPropertyValue('name') === '') {
                                throw new Error(`Required field name in the edge of Error NodeID ${node.getPropertyValue("id")}`);
                            } else {
                                errorBlocks.push(errorKey);
                            }
                        }
                    });
                }

                if (!foundTryBlock) {
                    throw new Error(`Error Handler block must have a try block in Error NodeID ${node.getPropertyValue("id")}`);
                }
                else if (!foundCatchBlock) {
                    throw new Error(`Error Handler block must have a catch block in Error NodeID ${node.getPropertyValue("id")}`);
                }
                else{
                    steps.push({'errorhandler': errorBlocks});
                }
                break;  
            case 'loop':
                const loopIteration = [];
                if (node.edges) {
                    node.edges.forEach(edge => {
                        if (node === edge.endNode) return;
                        
                        const loopSteps = [];
                        this.printNodeEdges(edge.endNode, loopSteps, visitedNodes);
                        const iterationKey = {
                            name:`iteration-${edge.endNode.getPropertyValue('id')}`,
                            condition: edge.getPropertyValue('expression'),
                            steps: loopSteps
                        };
                        
                        if (loopSteps.length > 0) {
                            if (edge.getPropertyValue('expression') === null || edge.getPropertyValue('expression') === '') {
                                throw new Error(`Required field expression in the edge of Loop NodeID ${node.getPropertyValue("id")}`);
                            } else {
                                loopIteration.push(iterationKey);
                            }
                        }
                    });
                }
                steps.push({'iterations': loopIteration});
                break;   
            default:
                node.edges.forEach(edge => {
                    this.printNodeEdges(edge.endNode, steps, visitedNodes);
                });
                break;
        }
    
        return steps;
    }

    addYamlNode(node, steps) {
        const step = {};
    
        node.properties.forEach((prop) => {
            if(prop.value !== null && !(Array.isArray(prop.value) && prop.value.length === 0) && !(typeof prop.value === 'object' && Object.keys(prop.value).length === 0)){
                if (prop.datatype == 'ArrayObject'){
                    step[prop.field] = prop.value[0];
                }
                else if(prop.datatype == 'Object'){
                    // Fix: Direct assignment instead of spread
                    step[prop.field] = prop.value;
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
            else{
                if (prop.required) {
                    throw new Error(`Required field ${prop.name} is empty in NodeID ${node.getPropertyValue("id")}`);
                }
            }
        });
        
        if (node.getPropertyValue('type') === 'harmonyhub-integration') {
            let new_step = {}
            let toolId = node.getPropertyValue('toolid');

            if (toolId === null || toolId === '') {
                throw new Error(`Required field toolid is empty in Integration NodeID ${node.getPropertyValue("id")}`);
            }else{
                // console.log("toolid",toolId);
                // console.log("tools",this.tools["Integration"]); 
                const tool = this.tools["Integration"].find(t => t.id === parseInt(toolId));
                // console.log("tool",tool);

                if (tool === undefined) {
                    throw new Error(`Invalid Tool ID ${toolId} in Integration NodeID ${node.getPropertyValue("id")}`);
                }else{

                    let old_variables = tool.properties.find(prop => prop.field === 'variables').value;
                    let new_variables = {};

                    for (let variable in old_variables) {
                        // console.log("variable",variable);
                        // console.log("old_variables[variable]",old_variables[variable]);
                        // console.log("new value",node.getPropertyValue(variable));
                        new_variables[variable] = node.getPropertyValue(variable);
                    }

                    new_step ={
                        id: node.getPropertyValue('id'),
                        type: node.getPropertyValue('type'),
                        name: node.getPropertyValue('name'),
                        toolid: node.getPropertyValue('toolid'),
                        headers: tool.properties.find(prop => prop.field === 'headers').value,
                        variables: new_variables,
                        steps: tool.properties.find(prop => prop.field === 'steps').value,
                    }
                }
                steps.push(new_step);
            }
        }else{
            steps.push(step);
        }
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
            
            if(!event.target){
                document.dispatchEvent(new CustomEvent('canvas-selected', { 
                    detail: { canvas: this } 
                }));

                
                window.focusState.previous = window.focusState.current
                window.focusState.current = "canvas"
                window.focusState.selectedNode= null
                window.focusState.selectedEdge = null
                window.focusState.selectedCanvas = this
                window.focusState.onPropertyPallet = false
            }
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
            },
            'mousedblclick': (e) => {
                const node = e.target.data;
                if (!node) return;
                else{
                    // console.log("Node Type",node.group.customType)
                    if(node.group.customType == "integration")
                    {
                        document.dispatchEvent(new CustomEvent('show-image-popup', {
                            detail: { nodeName: node.name, nodeImage: node.png }
                        }));
                        // console.log("Raised Event for ", node.name)
                    }
                }
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

                window.focusState.previous = window.focusState.current
                window.focusState.current = "canvas"
                window.focusState.selectedNode= null
                window.focusState.selectedEdge = null
                window.focusState.selectedCanvas = null
                window.focusState.onPropertyPallet = false

            }else if (e.key === 'Delete' && !window.focusState.onPropertyPallet && window.focusState.current === 'edge') {
                
                window.focusState.selectedEdge.deleteSelectedEdge(this.fabricCanvas);
                    document.dispatchEvent(new CustomEvent('deleted-attribute',{
                    detail: {canvas : this}
                }));

                window.focusState.previous = window.focusState.current
                window.focusState.current = "canvas"
                window.focusState.selectedNode= null
                window.focusState.selectedEdge = null
                window.focusState.selectedCanvas = null
                window.focusState.onPropertyPallet = false
            }
            else if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                try {
                    const yaml = this.generateYaml();

                    // console.log(yaml);
                    
                    // Dispatch event with YAML content
                    document.dispatchEvent(new CustomEvent('show-yaml', {
                        detail: { yaml }
                    }));
                } catch (error) {
                    console.error(`Error generating YAML: ${error.message}`);
                    document.dispatchEvent(new CustomEvent('display-error-message', {
                        detail: { message: `Error generating YAML. ${error.message}` }
                    }));
                }
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