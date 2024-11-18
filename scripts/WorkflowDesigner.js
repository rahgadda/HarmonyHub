let drawingEdge = false;
let sourceNode = null;
let sourcePoint = null;
let destNode = null;
let destPoint = null;

function calculateArrowAngle(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    return angle + 91; // Adjust for fabric.js coordinate system
}

export class Node {
    constructor(x, y, name, type) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = type === 'decision' ? 100 : 60;
        this.connections = [];
        this.connectionPoints = [];
        this.type = type;
        this.group = null;
        this.edges = [];

        // Properties
        this.properties = this.initializeProperties(type);
    }

    addConnection(node) {
        if (!this.connections.includes(node)) {
            this.connections.push(node);
        }
    }

    removeConnection(node) {
        const index = this.connections.indexOf(node);
        if (index !== -1) {
            this.connections.splice(index, 1);
        }
    }

    initializeProperties(type) {
        let properties = []
        switch (type) {
            case 'decision':
                properties = [
                    {
                        name: 'Name',
                        field: 'name',
                        datatype: 'Text',
                        required: true,
                        hint: 'Enter Node Name',
                        value: "Decision"
                    }
                ];
                break;
            case 'loop':
                properties = [
                    {
                        name: 'Name',
                        field: 'name',
                        datatype: 'Text',
                        required: true,
                        hint: 'Enter Node Name',
                        value: "Loop",
                    }
                ];
                break;
            case 'restapi':
                properties = [
                    {
                        name: 'Name',
                        field: 'name',
                        datatype: 'Text',
                        required: true,
                        hint: 'Enter Node Name',
                        value: "Rest API",
                    },
                    {
                        name: 'HTTP Method',
                        field: 'http.method',
                        datatype: 'Enumeration',
                        required: true,
                        options: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
                        hint: 'Enter HTTP Method GET, PUT, POST, PATCH, DELETE',
                        value: "GET",
                    },
                    {
                        name: 'URL',
                        field: 'http.url',
                        datatype: 'Text',
                        required: true,
                        hint: 'Enter URL',
                        value: null,
                    },
                    {
                        name: 'Headers',
                        field: 'headers',
                        datatype: 'Object',
                        required: false,
                        hint: 'Enter Headers {}',
                        value: {},
                    },
                    {
                        name: 'Data',
                        field: 'data',
                        datatype: 'TextLarge',
                        required: false,
                        hint: 'Enter PUT/POST/PATCH data',
                        value: null,
                    },
                    {
                        name: 'Output',
                        field: 'output',
                        datatype: 'Object',
                        required: false,
                        hint: 'Enter Output {}',
                        value: {}
                    },
                    {
                        name: 'Print',
                        field: 'print',
                        datatype: 'Array',
                        required: false,
                        hint: 'Enter Print []',
                        value: []
                    },
                    {
                        name: 'Tests',
                        field: 'tests',
                        datatype: 'ArrayObject',
                        required: false,
                        hint: 'Enter Tests [{}]',
                        value: []
                    }
                ];
                break;
        }
        return properties;
    }

    getPropertyValue(propertyName) {
        const prop = this.properties.find(p => p.field === propertyName);
        return prop ? prop.value : null;
    }
}

export class Edge {
    constructor(sourceNode, sourcePoint, destNode, destPoint) {
        this.sourceNode = sourceNode;
        this.sourcePoint = sourcePoint;
        this.destNode = destNode;
        this.destPoint = destPoint;
        this.group = null;
    }

    createLine(){
        const sourcePos = this.sourcePoint.getCenterPoint();
        const destPos = this.destPoint.getCenterPoint();

        // Create the line
        const line = new fabric.Line(
            [sourcePos.x, sourcePos.y, destPos.x, destPos.y],
            {
                stroke: '#000000',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                hasBorders: false,
                hasControls: false
            }
        );

        // Calculate the angle for the arrowhead
        const angle = calculateArrowAngle(sourcePos.x, sourcePos.y, destPos.x, destPos.y);

        // Create the arrowhead
        const arrowHead = new fabric.Triangle({
            left: destPos.x,
            top: destPos.y,
            originX: 'center',
            originY: 'center',
            angle: angle,
            width: 10,
            height: 10,
            fill: '#000000',
            selectable: false,
            evented: false,
            hasBorders: false,
            hasControls: false
        });

        // Create a group that contains both line and arrowHead
        const group = new fabric.Group([line, arrowHead], {
            selectable: true,
            hasControls: false,
            hasBorders: false,
            edge: this,
            customType: 'edge'
        });

        // Add the group to the canvas
        if (this.sourceNode.group.canvas.contains(this.group)) {
            this.sourceNode.group.canvas.remove(this.group);
        }
        this.group = group;
        this.sourceNode.group.canvas.add(this.group);

        // Attach event handlers to the edge group
        this.group.on({
            'selected': (e) => {
                const canvas = this.group.canvas;
                if (canvas) {
                    canvas.fire('edge:selected', { target: this.group });
                }
            }
        });
    }
}

export class WorkflowDesigner {
    constructor(canvasElement, backgroundColor) {
        this.canvasElement = canvasElement;
        this.backgroundColor = backgroundColor;
        this.canvas = null;

        // Drawing Node
        this.nodes = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.hoveredNode = null;

        // Properties
        this.metadata = {};
        this.variables = {}; 
        this.headers = {}; 

        // YAML content
        this.yamlContent = {
            apiVersion: "v1",
            kind: "Rest",
            workflow: {
                steps: []
            }
        };

        // Bind Node event handlers
        this.handleNodeMoving = this.handleNodeMoving.bind(this);
        this.handleNodeSelected = this.handleNodeSelected.bind(this);
        this.handleNodeHover = this.handleNodeHover.bind(this);
        this.handleNodeMouseOut = this.handleNodeMouseOut.bind(this);

        // Bind Edge event handlers
        this.handleEdgeSelected = this.handleEdgeSelected.bind(this);

        // Bind general event handlers
        this.handleSelectionCleared = this.handleSelectionCleared.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        this.initialize();
    }

    initialize() {
        try {
            this.canvas = new fabric.Canvas(this.canvasElement, {
                backgroundColor: this.backgroundColor,
                selection: true,
                preserveObjectStacking: true
            });
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize canvas:', error);
        }
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // General canvas events
        this.canvas.on({
            'selection:cleared': this.handleSelectionCleared,
            'mouse:down': this.handleMouseDown,
            'mouse:move': this.handleMouseMove,
            'mouse:up': this.handleMouseUp,
            'edge:selected': this.handleEdgeSelected
        });

        // Add keyboard event listener for delete
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
                if (this.selectedNode) {
                    this.deleteSelectedNode();
                } else if (this.selectedEdge) {
                    this.deleteSelectedEdge();
                }
            }
        });

        // Add event listener for node properties saved
        document.addEventListener('node-properties-saved', (e) => {
            const { node } = e.detail;
            this.modifyNode(node);
        });

        // Add event listener for canvas properties saved
        document.addEventListener('canvas-properties-saved', (e) => {
            this.updateYamlContent();
        });
    }

    // Node Methods
    addNode(type, x, y) {
        try {
            drawingEdge = false;
            sourceNode = null;
            sourcePoint = null;
            destNode = null;
            destPoint = null;

            const node = new Node(x, y, `New ${type}`, type);
            const shape = this.createNodeShape(type, node.width, node.height);

            const text = new fabric.Text(node.getPropertyValue("name"), {
                fontSize: 14,
                fill: '#000000',
                originX: 'center',
                originY: 'center',
                left: node.width / 2,
                top: node.height / 2,
                selectable: false,
                evented: false,
                hasBorders: false,
                hasControls: false
            });

            const points = this.createConnectionPoints(node);

            const allObjects = [shape, text, ...points];
            const group = new fabric.Group(allObjects, {
                left: x,
                top: y,
                width: node.width,
                height: node.height,
                hasControls: false,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                lockUniScaling: true,
                lockScalingFlip: true,
                selectable: true,
                hasBorders: true,
                subTargetCheck: true,
                data: node,
                hasBorders: false,
                hasControls: false,
                customType: 'node'
            });

            node.connectionPoints = points;
            node.group = group;
            this.nodes.push(node);
            this.canvas.add(group);

            // Attach event handlers to the node
            this.attachNodeEventHandlers(group);

            this.canvas.renderAll();

            // Update YAML content
            this.updateYamlContent();

            return node;
        } catch (error) {
            console.error('Error adding node:', error);
            throw error;
        }
    }

    removeNode(node) {
        if (node.group) {
            this.canvas.remove(node.group);
        }
        this.nodes = this.nodes.filter(n => n !== node);
        this.canvas.renderAll();
    }

    modifyNode(node) {
        if (!node.group) return;
        
        if (node.group) {
            const textObject = node.group.getObjects('text')[0];
            if (textObject) {
                textObject.set('text', node.getPropertyValue('name'));
            }
            this.canvas.renderAll();
        }
        this.updateYamlContent();
    }

    // Event Handlers for Nodes
    attachNodeEventHandlers(nodeGroup) {
        nodeGroup.on({
            'moving': this.handleNodeMoving,
            'selected': this.handleNodeSelected,
            'mouseover': this.handleNodeHover,
            'mouseout': this.handleNodeMouseOut
        });
    }

    handleNodeMoving(e) {
        const nodeGroup = e.transform.target;
        const node = nodeGroup?.data;

        if (node?.edges) {
            node.edges.forEach(edge => {
                edge.createLine();
            });
        }

        // Render the canvas once after all edges are updated
        this.canvas.renderAll();
    }

    handleNodeSelected(e) {
        this.selectedNode = e.target.data;
        this.showConnectionPoints(this.selectedNode);
        document.dispatchEvent(new CustomEvent('node-selected', { detail: { node: this.selectedNode } }));
    }

    handleNodeHover(e) {
        this.hoveredNode = e.target;
        this.showConnectionPoints(e.target.data);
    }

    handleNodeMouseOut(e) {
        const node = e.target?.data;
        if (node) {
            this.hideConnectionPoints(node);
        }
    }

    handleEdgeSelected(e) {
        this.selectedEdge = e.target.edge;
    }

    removeEdge(edge) {
        // Remove the edge group from canvas
        if (edge.group) {
            this.canvas.remove(edge.group);
        }

        // Remove edge from source node
        if (edge.sourceNode && edge.sourceNode.edges) {
            edge.sourceNode.edges = edge.sourceNode.edges.filter(e => e !== edge);
        }

        // Remove edge from destination node
        if (edge.destNode && edge.destNode.edges) {
            edge.destNode.edges = edge.destNode.edges.filter(e => e !== edge);
        }
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return;

        // Remove all connected edges first
        if (this.selectedNode.edges) {
            [...this.selectedNode.edges].forEach(edge => {
                this.removeEdge(edge);
            });
        }

        // Remove the node from canvas and nodes array
        this.removeNode(this.selectedNode);
        this.selectedNode = null;
        this.canvas.renderAll();
        
        this.updateYamlContent();
    }

    deleteSelectedEdge() {
        if (!this.selectedEdge) return;

        // Remove the edge from canvas and nodes
        this.removeEdge(this.selectedEdge);
        this.selectedEdge = null;
        this.canvas.renderAll();
    }

    // General Event Handlers
    handleSelectionCleared() {
        if (this.selectedNode) {
            this.hideConnectionPoints(this.selectedNode);
            this.selectedNode = null;
        }
        if (this.selectedEdge) {
            this.selectedEdge = null;
        }
        document.dispatchEvent(new CustomEvent('canvas-selected', { detail: { canvas: this } }));
    }

    handleMouseDown(e) {

    }

    handleMouseMove(e) {

    }

    handleMouseUp(e) {

    }

    handleConnectionPointClick(e) {
        const point = e.target;
        const node = point.node;

        if (drawingEdge && sourceNode !== node && !destNode) {
            destNode = node;
            destPoint = point;
            this.createEdge();
        } else {
            drawingEdge = true;
            sourceNode = node;
            sourcePoint = point;
            destNode = null;
            destPoint = null;
        }
    }

    // Helper Methods
    createNodeShape(type, width, height) {
        let shape;
        const commonProps = {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            hasBorders: false,
            hasControls: false
        };
        switch (type) {
            case 'decision':
                shape = new fabric.Polygon([
                    { x: width / 2, y: 0 },
                    { x: width, y: height / 2 },
                    { x: width / 2, y: height },
                    { x: 0, y: height / 2 }
                ], {
                    ...commonProps,
                    objectType: 'decision'
                });
                break;
            case 'loop':
                shape = new fabric.Rect({
                    width: width,
                    height: height,
                    rx: height / 2,
                    ry: height / 2,
                    ...commonProps,
                    objectType: 'loop'
                });
                break;
            case 'restapi':
                shape = new fabric.Rect({
                    width: width,
                    height: height,
                    rx: 5,
                    ry: 5,
                    ...commonProps,
                    objectType: 'restapi'
                });
                break;
            default:
                shape = new fabric.Rect({
                    width: width,
                    height: height,
                    ...commonProps,
                    objectType: 'default'
                });
        }
        return shape;
    }

    createConnectionPoints(node) {
        const points = [];
        const positions = ['top', 'right', 'bottom', 'left'];

        positions.forEach(position => {
            let left = 0;
            let top = 0;

            switch(position) {
                case 'top':
                    left = node.width / 2;
                    top = 0;
                    break;
                case 'right':
                    left = node.width;
                    top = node.height / 2;
                    break;
                case 'bottom':
                    left = node.width / 2;
                    top = node.height;
                    break;
                case 'left':
                    left = 0;
                    top = node.height / 2;
                    break;
                default:
                    left = node.width / 2;
                    top = node.height / 2;
            }

            const point = new fabric.Circle({
                radius: 10,
                fill: '#007bff',
                stroke: '#0056b3',
                originX: 'center',
                originY: 'center',
                left: left,
                top: top,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: true,
                position: position,
                visible: false,
                node: node,
                name: `connection-point-${position}`,
                hoverCursor: 'crosshair'
            });
            point.on('mousedown', (e) => {
                this.handleConnectionPointClick(e);
            });
            points.push(point);
        });

        return points;
    }

    showConnectionPoints(node) {
        if (!node.group) return;

        node.connectionPoints.forEach(point => {
            point.set({
                'visible': true,
                'evented': true
            });
            this.canvas.bringObjectToFront(point);
        });
        node.group.dirty = true;
        this.canvas.renderAll();
    }

    hideConnectionPoints(node) {
        if (!node.group) return;

        node.connectionPoints.forEach(point => {
            point.set({
                'visible': false,
                'evented': false
            });
        });
        node.group.dirty = true;
        this.canvas.renderAll();
    }

    // Edge Methods
    addEdge(){
        drawingEdge = true;
    }

    createEdge() {
        const edge = new Edge(sourceNode, sourcePoint, destNode, destPoint);
        edge.createLine();

        sourceNode.edges = sourceNode.edges || [];
        sourceNode.edges.push(edge);

        destNode.edges = destNode.edges || [];
        destNode.edges.push(edge);

        // Reset edge drawing state
        drawingEdge = false;
        sourceNode = null;
        sourcePoint = null;
        destNode = null;
        destPoint = null;

        // Render the canvas
        this.canvas.renderAll();
    }

    updateYamlContent() {
        //Update Canvas Data
        if (Object.keys(this.metadata).length !== 0)
            this.yamlContent.metadata = this.metadata;
        if (Object.keys(this.variables).length !== 0)
            this.yamlContent.variables = this.variables;
        if (Object.keys(this.headers).length !== 0)
            this.yamlContent.headers = this.headers;
        
        //Update Node Data
        this.yamlContent.workflow.steps = [];
        this.nodes.map(node => {            
            const step = {};
            node.properties.forEach((prop) => {
                if(prop.value !== null && !(Array.isArray(prop.value) && prop.value.length === 0) && !(typeof prop.value === 'object' && Object.keys(prop.value).length === 0)){
                    if (prop.datatype =='ArrayObject'){
                        step[prop.field] = prop.value[0];
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
            this.yamlContent.workflow.steps.push(step);
        });    
        const yamlString = jsyaml.dump(this.yamlContent);
        window.yamlString = yamlString;
        console.log(window.yamlString)
        
        const event = new CustomEvent('yaml-updated', { detail: { yamlString } });
        window.dispatchEvent(event);
    }

    resize(width, height) {
        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
        this.canvas.renderAll();
    }
}