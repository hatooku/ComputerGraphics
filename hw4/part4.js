"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 4;
const NORMAL_SIZE = 4;

// Background Color
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);

// Initial tetrahedron points
const va = vec4(0.0, 0.0, 1.0, 1);
const vb = vec4(0.0, 0.942809, -0.333333, 1);
const vc = vec4(-0.816497, -0.471405, -0.333333, 1);
const vd = vec4(0.816497, -0.471405, -0.333333, 1);

// Camera
const cameraRadius = 8;
const cameraRotationSpeed = 0.025;
var cameraTheta = 0;

var pointsArray = [];
var normalsArray = [];
var subdivisionLevel = 5;

const lightPosition = vec4(0, 0, 1, 0);

// L_e = L_a = L_d = L_s
var lightEmission = vec4(1.0, 1.0, 1.0, 1.0);

// Material
var materialAmbient = vec4(0.3, 0.3, 0.3, 1.0);
var materialDiffuse = vec4(0.5, 0.0, 0.0, 1.0);
var materialSpecular = vec4(0.5, 0.0, 0.0, 1.0);
var shininess = 400;

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

function triangle(v1, v2, v3) {
    normalsArray.push(v1);
    normalsArray.push(v2);
    normalsArray.push(v3);

    pointsArray.push(v1);
    pointsArray.push(v2);
    pointsArray.push(v3);
}

function redraw(buffers) {
    pointsArray = [];
    normalsArray = [];
    tetrahedron(va, vb, vc, vd, subdivisionLevel);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    // render();
    document.getElementById('Subdivision Level').innerHTML = subdivisionLevel;
}

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    function setupEventListeners() {
        var incrementButton = document.getElementById("Increment");
        incrementButton.addEventListener("click", function() { 
            if (subdivisionLevel < 8) {
                subdivisionLevel += 1;
                redraw(buffers);
            }
        });

        var decrementButton = document.getElementById("Decrement");
        decrementButton.addEventListener("click", function() { 
            if (subdivisionLevel > 0) {
                subdivisionLevel -= 1;
                redraw(buffers);
            }
        });

        var kaSlider = document.getElementById("kaSlider");
        kaSlider.addEventListener("input", function() {
            materialAmbient.fill(parseFloat(event.srcElement.value), 0, 3);
            var ambientProduct = mult(lightEmission, materialAmbient);
            gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), ambientProduct);
        });

        var kdSlider = document.getElementById("kdSlider");
        kdSlider.addEventListener("input", function() {
            materialDiffuse[0] = parseFloat(event.srcElement.value);
            var diffuseProduct = mult(lightEmission, materialDiffuse);
            gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), diffuseProduct);
        });

        var ksSlider = document.getElementById("ksSlider");
        ksSlider.addEventListener("input", function() {
            materialSpecular[0] = parseFloat(event.srcElement.value);
            var specularProduct = mult(lightEmission, materialSpecular);
            gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), specularProduct);
        });

        var shininessSlider = document.getElementById("shininessSlider");
        shininessSlider.addEventListener("input", function() {
            shininess = parseFloat(event.srcElement.value);
            gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);
        });
    }

    setupEventListeners();

    tetrahedron(va, vb, vc, vd, subdivisionLevel);
    document.getElementById('Subdivision Level').innerHTML = subdivisionLevel;

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

    const buffers = initBuffers();

    // Setup vPosition attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    const vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, POSITION_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    // Setup vNormal attribute
    const vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer( vNormal, NORMAL_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // Setup view, projection matrices
    var modelMatrixLocation = gl.getUniformLocation(program, "modelMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    var projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.0001, 100)

    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(0, 0, 0)));

    // Setup lightPosition
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));

    // Setup shininess
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

    // Setup light & material products
    var ambientProduct = mult(lightEmission, materialAmbient);
    var diffuseProduct = mult(lightEmission, materialDiffuse);
    var specularProduct = mult(lightEmission, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), specularProduct);

    function render() {
        cameraTheta = (cameraTheta + cameraRotationSpeed) % (2 * Math.PI);
        var eye =  vec3(cameraRadius * Math.sin(cameraTheta), 0, cameraRadius * Math.cos(cameraTheta));
        var at = vec3(0, 0, 0);
        var up = vec3(0.0, 1.0, 0.0);
        var viewMatrix = lookAt(eye, at, up);
        var viewMatrixLocation = gl.getUniformLocation(program, "viewMatrix");
        gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(viewMatrix));

        var modelMatrix = translate(0, 0, 0);
        var ctm = mult(viewMatrix, modelMatrix);
        var N = normalMatrix(ctm, true);
        gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(N));

        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.drawArrays( gl.TRIANGLES, 0, pointsArray.length);
        requestAnimFrame(render);
    }

    render(program);
};

function initBuffers() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
    };
}


