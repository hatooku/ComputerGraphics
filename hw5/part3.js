"use strict";

var gl;

var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

// Background Color
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);

// Camera
const cameraRadius = 75;
const cameraRotationSpeed = 0.025;
var cameraTheta = 0;

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
    }

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(BG_COL[0], BG_COL[1], BG_COL[2], BG_COL[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Load shaders and initialize attribute buffers
    const program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    // Get the storage locations of attribute and uniform variables
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    program.a_Color = gl.getAttribLocation(program, 'a_Color');

    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    var model = initVertexBuffers(gl, program);

    // Start reading the OBJ file
    readOBJFile('cessna.obj', gl, model, 1, true);

    // Setup view, projection matrices
    var modelMatrixLocation = gl.getUniformLocation(program, "modelMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    var projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.0001, 100)

    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(0, 0, 0)));
    
    function render() {
        cameraTheta = (cameraTheta + cameraRotationSpeed) % (2 * Math.PI);
        var eye =  vec3(cameraRadius * Math.sin(cameraTheta), 0, cameraRadius * Math.cos(cameraTheta));
        var at = vec3(0, 0, 0);
        var up = vec3(0.0, 1.0, 0.0);
        var viewMatrix = lookAt(eye, at, up);
        var viewMatrixLocation = gl.getUniformLocation(program, "viewMatrix");
        gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(viewMatrix));


        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, model, g_objDoc);
        }
        if (g_drawingInfo) {
            gl.clear( gl.COLOR_BUFFER_BIT );
            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length,
                            gl.UNSIGNED_SHORT, 0);
        }
        requestAnimFrame(render);
    }

    render();
};

// Create a buffer object and perform the initial configuration
function initVertexBuffers(gl, program) {
    var o = new Object();
    o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
    o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
    o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
    o.indexBuffer = gl.createBuffer();
    
    return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer = gl.createBuffer(); // Create a buffer object

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute); // Enable the assignment

    return buffer;
}

// Read a file
function readOBJFile(fileName, gl, model, scale, reverse) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status !== 404) {
            onReadOBJFile(request.responseText, fileName, gl, model, scale, reverse);
        }
    }
    request.open('GET', fileName, true); // Create a request to get file
    request.send(); // Send the request
}

// OBJ file has been read
function onReadOBJFile(fileString, fileName, gl, o, scale, reverse) {
    var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    var result = objDoc.parse(fileString, scale, reverse);
    if (!result) {
        g_objDoc = null; g_drawingInfo = null;
        console.log("OBJ file parsing error.");
        return;
    }
    g_objDoc = objDoc;
} 

// OBJ File has been read completely
function onReadComplete(gl, model, objDoc) {
    // Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices,gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
} 


