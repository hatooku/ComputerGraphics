"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 4;
const NORMAL_SIZE = 4;
const COLOR_SIZE = 4;
// const BG_COL = vec4(0.3921, 0.5843, 0.9294, 1.0);
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);

var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.942809, -0.333333, 1);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
var vd = vec4(0.816497, -0.471405, -0.333333, 1);

var pointsArray = [];
var normalsArray = [];

var subdivisionLevel = 3;

const cameraRadius = 8;
const cameraRotationSpeed = 0.05;
var cameraTheta = 0;

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

    // Attach "Increment" button event listener
    var incrementButton = document.getElementById("Increment");
    incrementButton.addEventListener("click", function() { 
        if (subdivisionLevel < 8) {
            subdivisionLevel += 1;
            redraw(buffers);
        }
    });

    // Attach "Decrement" button event listener
    var decrementButton = document.getElementById("Decrement");
    decrementButton.addEventListener("click", function() { 
        if (subdivisionLevel > 0) {
            subdivisionLevel -= 1;
            redraw(buffers);
        }
    });

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

    // Setup aPosition attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    const aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, POSITION_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    // Setup aNormal attribute
    const aNormal = gl.getAttribLocation( program, "aNormal" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer( aNormal, NORMAL_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aNormal );

    // // Setup aColor attribute
    // const aColor = gl.getAttribLocation( program, "aColor" );
    // gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    // gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray( aColor );

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

        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.drawArrays( gl.TRIANGLES, 0, pointsArray.length);
        requestAnimFrame(render);
    }

    render(program);
};

function initBuffers() {
    // // Color buffer
    // const colorBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

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
        // color: colorBuffer,
    };
}


