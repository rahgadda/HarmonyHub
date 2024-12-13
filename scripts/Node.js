import { Edge } from './Edge.js';

export class Node {
    constructor(x, y, name, type, properties) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.type = type;
        this.width = 100;
        this.heigh = 100;
        this.connections = [];
        this.connectionPoints = [];
        this.text = null;
        this.group = null;
        this.edges = [];

        // Track Node Movement
        this.isMoving = false;
     
        // Node Properties
        this.properties = this.initializeProperties(properties);

        // Node Connection Points
        this.connectionPoints = this.initializeConnectionPoints();
        this.activePointers = null;

        // Track Edges
        this.edges = [];

        // Only for Integrations
        this.headers = {};
        this.workflow = null;
    }

    initializeProperties(properties) {
        const allProperties = [
            {
                name: 'ID',
                field: 'id',
                datatype: 'Text',
                required: true,
                hint: 'Enter Node ID',
                value: window.getNextNodeId(),
                readOnly: false
            },
            {
                name: 'Type',
                field: 'type',
                datatype: 'Text',
                required: true,
                hint: 'Enter Node ID',
                value: this.type,
                readOnly: true
            },
            ...properties
        ]

        return allProperties;
    }

    getPropertyValue(propertyName) {
        const prop = this.properties.find(p => p.field === propertyName);
        return prop ? prop.value : null;
    }

    initializeConnectionPoints() {
        return [
            { id: 'N', x: 0, y: -50, active: false },
            { id: 'S', x: 0, y: 50, active: false },
            { id: 'E', x: 50, y: 0, active: false },
            { id: 'W', x: -50, y: 0, active: false }
        ];
    }

    createConnectionPointer(x, y, direction, fabricCanvas) {
        const size = 12;
        const height = size * Math.sqrt(3) / 2;
        
        const points = [
            { x: 0, y: -height/2 },
            { x: -size/2, y: height/2 },
            { x: size/2, y: height/2 }
        ];
        
        const angles = {
            'N': 0, 'S': 180, 'E': 90, 'W': 270
        };

        const pointer = new fabric.Polygon(points, {
            left: x,
            top: y,
            fill: '#4CAF50',
            stroke: '#45a049',
            strokeWidth: 2,
            selectable: false,
            data: { type: 'connection-point', direction, nodeId: this.id },
            angle: angles[direction],
            originX: 'center',
            originY: 'center',
            hoverCursor: 'pointer'
        });

        this.attachPointerEvents(pointer, fabricCanvas);
        return pointer;
    }

    attachPointerEvents(pointer, fabricCanvas) {
        let startNode = this;
        let startPoint = null;

        pointer.on({
            'mouseover': () => {

                pointer.set({
                    fill: '#000000',
                    scaleX: 1.2,
                    scaleY: 1.2,
                    shadow: new fabric.Shadow({
                        color: 'rgba(0,0,0,0.3)',
                        blur: 5,
                        hasBorders: false,
                        offsetX: 2,
                        offsetY: 2
                    })
                });
                fabricCanvas.renderAll();
            },
            'mouseout': () => {
                pointer.set({
                    fill: '#4CAF50',
                    scaleX: 1,
                    scaleY: 1,
                    shadow: null
                });
                fabricCanvas.renderAll();
            },
            'mousedown': () => {
                const workflowDesigner = window.workflowDesigner;

                // Clear any existing temp line first
                if (workflowDesigner.connectionState.tempLine) {
                    fabricCanvas.remove(workflowDesigner.connectionState.tempLine);
                    workflowDesigner.connectionState.tempLine = null;
                }

                const pointCoord = workflowDesigner.getConnectionPointCoordinates(this, pointer.data.direction);
                
                workflowDesigner.connectionState = {
                    isConnecting: true,
                    startNode: this,
                    startPoint: pointer.data.direction,
                    startCoord: pointCoord,
                    tempLine: null
                };

                // console.log('Connection started from:', pointer.data.direction);
            },
            'mouseup': () => {
                const workflowDesigner = window.workflowDesigner;
                const endNode = this;

                // Clean up temp line if connection is invalid
                if (workflowDesigner.connectionState.isConnecting) {
                    if (endNode && 
                        workflowDesigner.connectionState.startNode !== endNode) {
                        
                        // Valid connection - create edge
                        const edge = new Edge(
                            workflowDesigner.connectionState.startNode,
                            endNode,
                            workflowDesigner.connectionState.startPoint,
                            pointer.data.direction
                        );
                        edge.createEdge(fabricCanvas);
                        
                        workflowDesigner.connectionState.startNode.addEdge(edge);
                        endNode.addEdge(edge);
                        // console.log('Start Nodes Edges:', workflowDesigner.connectionState.startNode.edges);
                    }

                    // Always clean up temp line
                    if (workflowDesigner.connectionState.tempLine) {
                        fabricCanvas.remove(workflowDesigner.connectionState.tempLine);
                    }

                    // Reset connection state
                    workflowDesigner.connectionState = {
                        isConnecting: false,
                        startNode: null,
                        startPoint: null,
                        tempLine: null
                    };
                    
                    fabricCanvas.renderAll();
                }
            }
        });
    }

    showConnectionPoints(fabricCanvas) {

        if (this.isMoving) {
            return;
        }

        this.hideConnectionPoints(fabricCanvas);

        const groupCenter = this.group.getCenterPoint();
        const points = [];

        this.connectionPoints.forEach(point => {
            const pointer = this.createConnectionPointer(
                groupCenter.x + point.x,
                groupCenter.y + point.y,
                point.id,
                fabricCanvas
            );
            points.push(pointer);
        });

        this.activePointers = points;
        points.forEach(p => fabricCanvas.add(p));
        fabricCanvas.renderAll();
    }

    hideConnectionPoints(fabricCanvas) {
        if (this.activePointers) {
            this.activePointers.forEach(point => {
                fabricCanvas.remove(point);
            });
            this.activePointers = null;
            fabricCanvas.renderAll();
        }
    }

    addEdge(edge) {
        this.edges.push(edge);
    }

    removeEdge(edge) {
        const index = this.edges.indexOf(edge);
        if (index > -1) {
            this.edges.splice(index, 1);
        }
    }
}