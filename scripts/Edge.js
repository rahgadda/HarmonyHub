export class Edge {
    constructor(startNode, endNode, startPoint, endPoint) {
        this.id = `edge_${this.generateUUID()}`;
        this.startNode = startNode;
        this.endNode = endNode;
        this.startPoint = startPoint; // N,S,E,W
        this.endPoint = endPoint;
        this.line = null;
        this.text = null;
        this.arrowHead = null;
        this.edgeGroup = null;

        // Properties
        this.properties = this.initializeProperties();
    }

    initializeProperties() {
        let properties = [
            {
            name: 'Name',
            field: 'name',
            datatype: 'Text',
            required: false,
            hint: 'Enter Edge Name',
            value: "",
            }
        ];

        if (this.startNode.type === 'switch') {
            properties.push({
                name: 'Expression',
                field: 'expression',
                datatype: 'Text',
                required: true,
                hint: 'Enter Decision Expression',
                value: "",
            });
        }else if(this.startNode.type === 'loop'){
            properties.push({
                name: 'Expression',
                field: 'expression',
                datatype: 'Text',
                required: true,
                hint: 'Enter Loop Expression',
                value: "",
            });
        }

        return properties;
    }

    getPropertyValue(propertyName) {
        // console.log("Getting property value for ", propertyName);
        // console.log("Properties", this.properties); 
        const prop = this.properties.find(p => p.field === propertyName);
        return prop ? prop.value : null;
    }

    setPropertyValue(propertyName, value) {
        // console.log("Setting property value for ", propertyName);
        // console.log("Updated Properties", this.properties);
        this.properties = this.properties.map(p => p.field === propertyName ? { ...p, value } : p);
        // console.log("Updated Properties", this.properties);
    }


    createEdge(fabricCanvas) {
        // Get connection points
        const start = this.getConnectionCoordinates(this.startNode, this.startPoint);
        const end = this.getConnectionCoordinates(this.endNode, this.endPoint);
        const label = this.getPropertyValue('name');
    
        // Create line
        // this.line = new fabric.Line([start.x, start.y, end.x, end.y], {
        //     stroke: '#4CAF50',
        //     strokeWidth: 2,
        //     selectable: false,
        //     evented: false,
        //     hasBorders: false,
        //     hasControls: false
        // });
        this.line = this.createRightAngleLine(start.x, start.y, end.x, end.y);
    
        // Calculate midpoint for text
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
    
        // Create text with proper positioning
        this.text = new fabric.Text(label, {
            left: midX,
            top: midY,
            fontSize: 14,
            fill: '#4CAF50',
            backgroundColor: label=== '' ?'#4CAF50':'#8EBAFD',
            padding: 5,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            hasBorders: false,
            hasControls: false
        });
    
        // Calculate arrow angle
        const angle = this.calculateArrowAngle();
    
        // Create arrow with proper positioning 
        this.arrowHead = new fabric.Triangle({
            left: (this.startPoint=='E' && this.endPoint=='W') || (this.startPoint=='S' && this.endPoint=='W') ? end.x +5 :end.x,
            top: end.y,
            angle: angle,
            width: 15,
            height: 15,
            fill: '#4CAF50',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            hasBorders: false,
            hasControls: false,
            data: { type: 'edge-arrow', id: this.id }
        });
    
        // Create group
        this.edgeGroup = new fabric.Group([this.line, this.text, this.arrowHead], {
            selectable: true,
            evented: true,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            edge: this,
            data: { type: 'edge', id: this.id }
        });

        // Attach events
        this.attachGroupEvents(fabricCanvas);

        fabricCanvas.add(this.edgeGroup);
        fabricCanvas.renderAll();
    }

    deleteSelectedEdge(fabricCanvas) {

        if (this.edgeGroup !== null) {
            if (this.startNode){
                // console.log("Removing edge from start node", this.startNode.type);
                this.startNode.removeEdge(this); 
            }
            if (this.endNode){
                // console.log("Removing edge end start node", this.endNode.type);
                this.endNode.removeEdge(this); 
            }

            // remove edge from canvas
            fabricCanvas.remove(this.edgeGroup);
        }
    }

    deleteSelectedEdgeGroup(fabricCanvas) {
        if (this.edgeGroup !== null) {
            fabricCanvas.remove(this.edgeGroup);
        }
    }

    // Event Listeners
    attachGroupEvents(fabricCanvas) {
        // Mouse & Keyboard Events
        this.edgeGroup.on({
            'selected': (e) => {
                document.dispatchEvent(new CustomEvent('edge-selected', { detail: { edge: this } }));
            }
        });
    }

    // Helper Functions
    // 1. Get connection coordinates
    getConnectionCoordinates(node, point) {
        const groupCenter = node.group.getCenterPoint();
        const connectionPoint = node.connectionPoints.find(p => p.id === point);
        
        return {
            x: groupCenter.x + connectionPoint.x,
            y: groupCenter.y + connectionPoint.y
        };
    }

    // 2. Generate UUID
    generateUUID() {
        // Generate a random 16-byte array
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
      
        // Convert the array to a hexadecimal string
        let uuid = '';
        array.forEach((byte) => {
          uuid += byte.toString(16).padStart(2, '0');
        });
      
        // Format the UUID into the standard format
        return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
    }

    // 3. Calculate arrow angle
    calculateArrowAngle(){

        // console.log("Start Point", this.startPoint);
        // console.log("End Point", this.endPoint);

        if (this.endPoint === 'S') {
            return 0;
        }
        if (this.endPoint === 'N') {
            return 180;
        }
        if (this.endPoint === 'W') {
            return 90;
        }
        if (this.endPoint === 'E') {
            return -90;
        }
    }

    // 4. Create Right Angle Line
    createRightAngleLine(x1, y1, x2, y2) {
        const defaultOptions = {
            stroke: '#4CAF50',
            fill: 'transparent',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            hasBorders: false,
            hasControls: false
        };

        const middleY = (y1 + y2) / 2;
        const verticalFirstPath = [
            { x: x1, y: y1 },
            { x: x1, y: middleY },
            { x: (this.endPoint === 'W') ? x2-5 : (this.endPoint === 'E')? x2+10 :x2 , y: middleY },
            { x: (this.endPoint === 'W') ? x2-5: (this.endPoint === 'E')? x2+10 :x2 , y: y2 }
        ];

        if (this.endPoint=='W') {
            verticalFirstPath.push({ x: x2 - 5, y: y2 });
        }else if (this.endPoint=='E') {
            verticalFirstPath.push({ x: x2 + 10, y: y2 });
        }

        const verticalLine = new fabric.Polyline(verticalFirstPath, { ...defaultOptions });

        return verticalLine;
    }
}
