"use strict";

const obj_filename = 'teapot.obj'
const EPSILON = 0.1;
const OFFSCREEN_WIDTH = 1024, OFFSCREEN_HEIGHT = 1024;

var gl;

var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

var debug_mode = false;
var animate_light = true;

// Background Color
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);
var test=  true;
// Teapot Height
var teapot_velocity = 0.02;
var teapot_freeze = false;
const teapot_max_height = 1;
const teapot_min_height = -0.8;
var teapot_height = teapot_min_height;

// Lighting
const lightRadius = 1;
var lightTheta = 0;
const lightSpeed = 0.03;
const lightEmission = vec4(1.0, 1.0, 1.0, 1.0); // L_e = L_a = L_d = L_s
const lightHeight = 4;

// Material
const materialAmbient = vec4(0.1, 0.1, 0.1, 1.0);
const materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const materialSpecular = vec4(1.0, 0.0, 0.0, 1.0);
const shininess = 1000;

// Ground
const ground_alpha = 0.5;
const modelMatrix2 = translate(0, 0, 0);
const ground_points = [
    vec3(-2,-1,-5),
    vec3(-2,-1,-1),
    vec3(2,-1,-5),
    vec3(2,-1,-1),
]

const texCoords = [
    vec2(0, 0.5),
    vec2(0, 0.0),
    vec2(0.5, 0.5),
    vec2(0.5, 0.0),
];

// For Ground Reflection
const P = vec3(0, -1, -3);
const V = vec3(0.0, 1.0, 0.0);
var R = mat4();
R[0][0] = 1 - 2 * V[0] * V[0];
R[0][1] = -2 * V[0] * V[1];
R[0][2] = -2 * V[0] * V[2];
R[0][3] = 2 * dot(P, V) * V[0];
R[1][0] = -2 * V[0] * V[1];
R[1][1] = 1 - 2 * V[1] * V[1];
R[1][2] = -2 * V[1] * V[2];
R[1][3] = 2 * dot(P, V) * V[1];
R[2][0] = -2 * V[0] * V[2];
R[2][1] = -2 * V[1] * V[2];
R[2][2] = 1 - 2 * V[2] * V[2];
R[2][3] = 2 * dot(P, V) * V[2];
const identity_mat4 = mat4();

const centerMatrix = translate(0, -1, -3);

// Shadows
const shadowProjectionMatrix = perspective(90.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0)

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

    gl = WebGLUtils.setupWebGL(canvas, { alpha: false, stencil: true });
    if (!gl) {
        alert( "WebGL isn't available" );
    }

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clearStencil(0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.cullFace(gl.BACK);

    // Load shaders and initialize attribute buffers
    const shadow_program = initShaders( gl, "vertex-shader-shadow", "fragment-shader-shadow" );
    const program1 = initShaders( gl, "vertex-shader1", "fragment-shader1" );
    const program2 = initShaders( gl, "vertex-shader2", "fragment-shader2" );

    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = function () {
        // Texture 1
        var texture1 = gl.createTexture();

        gl.activeTexture(gl.TEXTURE1);
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

    // Setup shadow_program
    gl.useProgram(shadow_program);
    var shadow_buffer = initShadowBuffer(gl);
    shadow_program.a_Position = gl.getAttribLocation(shadow_program, 'a_Position');

    // Perspective Matrix
    var shadowProjectionMatrixLocation = gl.getUniformLocation(shadow_program, "projectionMatrix");
    gl.uniformMatrix4fv(shadowProjectionMatrixLocation, false, flatten(shadowProjectionMatrix));

    // Frame buffer
    var fbo = initFramebufferObject(gl);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

    // Setup program1
    gl.useProgram(program1);

    // Get the storage locations of attribute and uniform variables
    program1.a_Position = gl.getAttribLocation(program1, 'a_Position');
    program1.a_Normal = gl.getAttribLocation(program1, 'a_Normal');
    program1.a_Color = gl.getAttribLocation(program1, 'a_Color');

    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    var buffers1 = initBuffers1(gl, program1);

    // Start reading the OBJ file
    readOBJFile(obj_filename, gl, 0.25, true);

    // Setup model, projection matrices
    var projectionMatrixLocation = gl.getUniformLocation(program1, "projectionMatrix");
    var projectionMatrix = perspective(65.0, canvas.width/canvas.height, 0.0001, 100);
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

    // Setup program 2
    gl.useProgram(program2);

    // Get the storage locations of attribute and uniform variables
    program2.aPosition = gl.getAttribLocation(program2, 'aPosition');
    program2.vTexCoord = gl.getAttribLocation(program2, 'vTexCoord');

    const buffers2 = initBuffers2();

    gl.uniform1f(gl.getUniformLocation(program2, "alpha"), ground_alpha);
    gl.uniform1i(gl.getUniformLocation(program2, "texMap"), 1);
    gl.uniformMatrix4fv(gl.getUniformLocation(program2, "modelMatrix"), false, flatten(modelMatrix2));
    gl.uniformMatrix4fv(gl.getUniformLocation(program2, "projectionMatrix"), false, flatten(projectionMatrix));

    function render() {

        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, buffers1, shadow_buffer, g_objDoc);
        }
        if (!g_drawingInfo) {
            requestAnimFrame(render);
            return;
        }
        /*
         * Setup
         */
        gl.clear( gl.COLOR_BUFFER_BIT );

        var debug_eye = vec3(0, 8, -3);
        var debug_at = vec3(0, -1, -3);
        var debug_up = vec3(0.0, 0.0, -1.0);

        var eye =  vec3(0, 1, 2);
        var at = vec3(0, 0, -3);
        var up = vec3(0.0, 1.0, 0.0);

        var viewMatrix = debug_mode ? lookAt(debug_eye, debug_at, debug_up) : lookAt(eye, at, up);

        if (teapot_height > teapot_max_height || teapot_height < teapot_min_height) {
            teapot_velocity *= -1;
        }
        if (!teapot_freeze) {
            teapot_height += teapot_velocity;
        }

        var modelMatrix1 = mult(translate(0, teapot_height, 0), centerMatrix);

        if (animate_light) {
            lightTheta = (lightTheta + lightSpeed) % (2 * Math.PI);
        }
        var lightPosition = 
            mult(centerMatrix, vec4(lightRadius * Math.sin(lightTheta), lightHeight, lightRadius * Math.cos(lightTheta), 1));

        /*
         * Shadow Map
         */
        gl.useProgram(shadow_program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // For FBO
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear FBO
        gl.clear( gl.DEPTH_BUFFER_BIT );

        var shadowEye = vec3(lightPosition);
        var shadowViewMatrix = lookAt(shadowEye, at, up);
        gl.uniformMatrix4fv(gl.getUniformLocation(shadow_program, "viewMatrix"), false, flatten(shadowViewMatrix));
        initAttributeVariable(gl, shadow_program.a_Position, shadow_buffer.vertexBuffer);

        // Shadow Map Ground
        gl.uniformMatrix4fv(gl.getUniformLocation(shadow_program, "modelMatrix"), false, flatten(modelMatrix2));
        gl.drawArrays( gl.TRIANGLE_STRIP, g_drawingInfo.vertices.length / 3, ground_points.length );

        // Shadow Map Teapot
        gl.uniformMatrix4fv(gl.getUniformLocation(shadow_program, "modelMatrix"), false, flatten(modelMatrix1));
        gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length,
                        gl.UNSIGNED_SHORT, 0);

        var mvpMatrixFromLight1 = mult(mult(shadowProjectionMatrix, shadowViewMatrix), modelMatrix1);
        var mvpMatrixFromLight2 = mult(mult(shadowProjectionMatrix, shadowViewMatrix), modelMatrix2);

        // Reset
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);

        /*
         * Stencil 
         */ 
        // Write 1 to stencil buffer for ground pixels
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS, 1, 1);
        gl.stencilOp(gl.KEEP, gl.REPLACE, gl.REPLACE);
        renderGround(program2, buffers2, viewMatrix, mvpMatrixFromLight2);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        // Render reflection if stencil is 1
        gl.useProgram(program1);
        gl.stencilFunc(gl.EQUAL, 1, 1);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        var eyespacePoints = 
            ground_points.map(point => getEyeSpacePoint(viewMatrix, modelMatrix2, point))
        var plane = getPlane(eyespacePoints[0], eyespacePoints[1], eyespacePoints[2]);
        var newProjectionMatrix = modifyProjectionMatrix(plane, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "projectionMatrix"), false, flatten(newProjectionMatrix));
        renderTeapot(program1, buffers1, modelMatrix1, viewMatrix, lightPosition, mvpMatrixFromLight1, R)
        gl.disable(gl.STENCIL_TEST);
        gl.clear( gl.DEPTH_BUFFER_BIT );
        gl.uniformMatrix4fv(gl.getUniformLocation(program1, "projectionMatrix"), false, flatten(projectionMatrix));

        // Render ground and teapot as normal
        renderGround(program2, buffers2, viewMatrix, mvpMatrixFromLight2);
        renderTeapot(program1, buffers1, modelMatrix1, viewMatrix, lightPosition, mvpMatrixFromLight1)

        requestAnimFrame(render);
    }
};

function renderGround(program, buffers, viewMatrix, mvpMatrixFromLight){
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "u_ShadowMap"), 0);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_MvpMatrixFromLight"), false, flatten(mvpMatrixFromLight));
    initAttributeVariable(gl, program.aPosition, buffers.position);
    initAttributeVariable(gl, program.vTexCoord, buffers.texture);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, ground_points.length );
}

function renderTeapot(program, buffers, modelMatrix, viewMatrix, lightPosition, mvpMatrixFromLight, R=identity_mat4) {
    gl.useProgram(program);

    initAttributeVariable(gl, program.a_Position, buffers.vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, buffers.normalBuffer);
    initAttributeVariable(gl, program.a_Color, buffers.colorBuffer);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelMatrix"), false, flatten(modelMatrix));
    gl.uniform1i(gl.getUniformLocation(program, "u_ShadowMap"), 0);
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));

    var ctm = mult(viewMatrix, modelMatrix);
    var N = normalMatrix(ctm, true);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(N));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_MvpMatrixFromLight"), false, flatten(mvpMatrixFromLight));

    // Draw reflection teapot
    gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "R"), false, flatten(R));
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.CULL_FACE);
}

function initShadowBuffer(gl) {
    var o = new Object();

    o.vertexBuffer = gl.createBuffer();
    o.vertexBuffer.num = 3;
    o.vertexBuffer.type = gl.FLOAT;

    o.indexBuffer = gl.createBuffer();

    return o
}

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
function readOBJFile(fileName, gl, scale, reverse) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status !== 404) {
            onReadOBJFile(request.responseText, fileName, gl, scale, reverse);
        }
    }
    request.open('GET', fileName, true); // Create a request to get file
    request.send(); // Send the request
}

// OBJ file has been read
function onReadOBJFile(fileString, fileName, gl, scale, reverse) {
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
function onReadComplete(gl, model, shadow_model, objDoc) {
    // Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();

    // Write data into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices,gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    // Shadow buffers
    const positionBufferSize = 4 * (drawingInfo.vertices.length + 3 * ground_points.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, shadow_model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positionBufferSize, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, drawingInfo.vertices);
    gl.bufferSubData(gl.ARRAY_BUFFER, 4 * drawingInfo.vertices.length, flatten(ground_points));

    // Teapot Indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shadow_model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
    return drawingInfo;
} 

function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;
    framebuffer = gl.createFramebuffer();
    texture = gl.createTexture(); // Create a texture object
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer.texture = texture; // Store the texture object

    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check whether FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (e !== gl.FRAMEBUFFER_COMPLETE) {
        console.log('Framebuffer object is incomplete: ' + e.toString());
        return error();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // reset selected frame buffer

    return framebuffer;
}

function modifyProjectionMatrix(clipplane, projection) {
    var oblique = mult(mat4(), projection); // copy
    var q = vec4((Math.sign(clipplane[0]) + projection[0][2])/projection[0][0],
                 (Math.sign(clipplane[1]) + projection[1][2])/projection[1][1],
                 -1.0,
                 (1.0 + projection[2][2])/projection[2][3]);
    var s = 2.0/dot(clipplane, q);
    oblique[2] = vec4(clipplane[0]*s, clipplane[1]*s,
    clipplane[2]*s + 1.0, clipplane[3]*s);
    return oblique;
}

function getPlane(point1, point2, point3) {
    var p1 = point1.slice(0,3);
    var p2 = point2.slice(0,3);
    var p3 = point3.slice(0,3);
    var v1 = subtract(p1, p2);
    var v2 = subtract(p3, p2);
    var cross_product = cross(v1, v2);
    var d = -1 * dot(cross_product, p1);
    return vec4(cross_product, d);
}

function getEyeSpacePoint(viewMatrix, modelMatrix, point) {
    return mult(viewMatrix, mult(modelMatrix, vec4(point, 1)));
}
