"use strict";

const obj_filename = 'teapot.obj'
const EPSILON = 0.1;

var gl;

var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

var debug_mode = false;
var animate_light = true;

// Background Color
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);

// Teapot Height
var teapot_height = 0;
var teapot_velocity = 0.02;
var teapot_freeze = false;
const teapot_max_height = 2.5;

// Camera
const cameraRadius = 4;

// Lighting
var lightRadius = 1;
var lightTheta = 0;
var lightSpeed = 0.03;
var lightEmission = vec4(1.0, 1.0, 1.0, 1.0); // L_e = L_a = L_d = L_s

// Material
var materialAmbient = vec4(0.1, 0.1, 0.1, 1.0);
var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var materialSpecular = vec4(1.0, 0.0, 0.0, 1.0);
var shininess = 1000;

// Ground
var modelMatrix2 = translate(0, 0, 0);
const ground_points = [
    vec3(-2,-1,-5),
    vec3(-2,-1,-1),
    vec3(2,-1,-5),
    vec3(2,-1,-1),
]

var texCoords = [
    vec2(0, 0.0),
    vec2(0, 1.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
];

const DEFAULT_VISIBILITY = vec4(1.0,1.0,1.0,1.0);

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    // Attach "Teapot" button event listener
    var teapotButton = document.getElementById("Teapot");
    teapotButton.addEventListener("click", function() { 
        teapot_freeze = !teapot_freeze;
    });

    // Attach "Debug" button event listener
    var debugButton = document.getElementById("Debug");
    debugButton.addEventListener("click", function() { 
        debug_mode = !debug_mode;
    });

    // Attach "Light" button event listener
    var lightButton = document.getElementById("Light");
    lightButton.addEventListener("click", function() { 
        animate_light = !animate_light;
    });

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
    }

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Load shaders and initialize attribute buffers
    const program1 = initShaders( gl, "vertex-shader1", "fragment-shader1" );
    const program2 = initShaders( gl, "vertex-shader2", "fragment-shader2" );

    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = function () {
        // Texture 1
        var texture1 = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        render();
    };
    image.src = 'xamp23.png';


    // Setup program1
    gl.useProgram(program1);

    // Get the storage locations of attribute and uniform variables
    program1.a_Position = gl.getAttribLocation(program1, 'a_Position');
    program1.a_Normal = gl.getAttribLocation(program1, 'a_Normal');
    program1.a_Color = gl.getAttribLocation(program1, 'a_Color');

    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    var buffers1 = initBuffers1(gl, program1);

    // Start reading the OBJ file
    readOBJFile(obj_filename, gl, buffers1, 0.25, true);

    // Setup model, projection matrices
    var projectionMatrixLocation = gl.getUniformLocation(program1, "projectionMatrix");

    var projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.0001, 100)

    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));

    // Setup lighting
    gl.uniform1f(gl.getUniformLocation(program1, "shininess"), shininess);

    // Setup light & material products
    var ambientProduct = mult(lightEmission, materialAmbient);
    var diffuseProduct = mult(lightEmission, materialDiffuse);
    var specularProduct = mult(lightEmission, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program1, "ambientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program1, "diffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program1, "specularProduct"), specularProduct);

    gl.uniform4fv(gl.getUniformLocation(program1, "visibility"), DEFAULT_VISIBILITY);

    // Setup program 2
    gl.useProgram(program2);

    // Get the storage locations of attribute and uniform variables
    program2.aPosition = gl.getAttribLocation(program2, 'aPosition');
    program2.vTexCoord = gl.getAttribLocation(program2, 'vTexCoord');

    const buffers2 = initBuffers2();

    gl.uniform1i(gl.getUniformLocation(program2, "texMap"), 0);
    gl.uniformMatrix4fv(gl.getUniformLocation(program2, "modelMatrix"), false, flatten(modelMatrix2));
    gl.uniformMatrix4fv(gl.getUniformLocation(program2, "projectionMatrix"), false, flatten(projectionMatrix));

    function render() {
        gl.clear( gl.COLOR_BUFFER_BIT );

        // Shared
        if (debug_mode) {
            var eye =  vec3(0, cameraRadius * 2, -3);
            var at = vec3(0, -1, -3);
            var up = vec3(0.0, 0.0, -1.0);
        }
        else {
            var eye =  vec3(0, 0.5, cameraRadius);
            var at = vec3(0, 0, 0);
            var up = vec3(0.0, 1.0, 0.0);
        }

        var viewMatrix = lookAt(eye, at, up);

        // Draw Ground
        gl.useProgram(program2);
        initAttributeVariable(gl, program2.aPosition, buffers2.position);
        initAttributeVariable(gl, program2.vTexCoord, buffers2.texture);
        gl.uniformMatrix4fv(gl.getUniformLocation(program2, "viewMatrix"), false, flatten(viewMatrix));

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, ground_points.length );

        // Draw Teapot & Shadow
        gl.useProgram(program1);

        if (teapot_height > teapot_max_height || teapot_height < 0) {
            teapot_velocity *= -1;
        }

        if (!teapot_freeze) {
            teapot_height += teapot_velocity;
        }

        var centerMatrix = translate(0, -1, -3);
        var decenterMatrix = translate(0, 1, 3);
        var modelMatrix1 = mult(translate(0, teapot_height, 0), centerMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "modelMatrix"), false, flatten(modelMatrix1));

        initAttributeVariable(gl, program1.a_Position, buffers1.vertexBuffer);
        initAttributeVariable(gl, program1.a_Normal, buffers1.normalBuffer);
        initAttributeVariable(gl, program1.a_Color, buffers1.colorBuffer);

        if (animate_light) {
            lightTheta = (lightTheta + lightSpeed) % (2 * Math.PI);
        }

        var lightPosition = 
            mult(centerMatrix, vec4(lightRadius * Math.sin(lightTheta), 3, lightRadius * Math.cos(lightTheta), 1));
        gl.uniform4fv(gl.getUniformLocation(program1, "lightPosition"), flatten(lightPosition));

        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "viewMatrix"), false, flatten(viewMatrix));

        var ctm = mult(viewMatrix, modelMatrix1);
        var N = normalMatrix(ctm, true);
        gl.uniformMatrix3fv(gl.getUniformLocation(program1, "normalMatrix"), false, flatten(N));

        // Shadows
        var adjusted_lightPosition = mult(decenterMatrix, lightPosition);

        var m = mat4(); // Shadow projection matrix initially an identity matrix
        m[3][3] = 0.0;
        m[3][1] = -1.0/(adjusted_lightPosition[1] - (ground_points[0][1] - (-1 + teapot_height) - EPSILON)); // add small value to avoid flickering
        
        var shadowModelMatrix = mult(modelMatrix1, translate(adjusted_lightPosition[0], adjusted_lightPosition[1], adjusted_lightPosition[2]));
        shadowModelMatrix = mult(shadowModelMatrix, m);
        shadowModelMatrix = mult(shadowModelMatrix, translate(-adjusted_lightPosition[0], -adjusted_lightPosition[1], -adjusted_lightPosition[2]));

        gl.uniform4fv(gl.getUniformLocation(program1, "visibility"), vec4(0, 0, 0, 1)); // Black

        gl.depthFunc(gl.GREATER);
        gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "modelMatrix"), false, flatten(shadowModelMatrix));
        if (g_drawingInfo) {
            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length,
                            gl.UNSIGNED_SHORT, 0);
        }
        // Reset sttings
        gl.depthFunc(gl.LESS);
        gl.uniform4fv(gl.getUniformLocation(program1, "visibility"), DEFAULT_VISIBILITY);
        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "modelMatrix"), false, flatten(modelMatrix1));
        gl.enable(gl.CULL_FACE);

        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, buffers1, g_objDoc);
        }

        // Draw teapot
        if (g_drawingInfo) {
            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length,
                            gl.UNSIGNED_SHORT, 0);
        }

        requestAnimFrame(render);
    }
};

// Create a buffer object and perform the initial configuration
function initBuffers1(gl, program) {
    var o = new Object();

    o.vertexBuffer = gl.createBuffer();
    o.vertexBuffer.num = 3;
    o.vertexBuffer.type = gl.FLOAT;

    o.normalBuffer = gl.createBuffer();
    o.normalBuffer.num = 3;
    o.normalBuffer.type = gl.FLOAT;

    o.colorBuffer = gl.createBuffer();
    o.colorBuffer.num = 4;
    o.colorBuffer.type = gl.FLOAT;

    o.indexBuffer = gl.createBuffer();
    
    return o;
}

function initBuffers2() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positionBufferSize = 4 * 3 * ground_points.length;
    gl.bufferData(gl.ARRAY_BUFFER, positionBufferSize, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(ground_points));
    positionBuffer.num = 3;
    positionBuffer.type = gl.FLOAT;

    const tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    const tBufferSize = 4 * 2 * ground_points.length;
    gl.bufferData(gl.ARRAY_BUFFER, tBufferSize, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(texCoords));

    tBuffer.num = 2;
    tBuffer.type = gl.FLOAT;

    return {
        position: positionBuffer,
        texture: tBuffer,
    };
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

function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}
