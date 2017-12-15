"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 4
const COLOR_SIZE = 4

var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.942809, -0.333333, 1);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
var vd = vec4(0.816497, -0.471405, -0.333333, 1);

var points = [];

var subdivisionLevel = 6;

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
    points.push(v1);
    points.push(v2);
    points.push(v3);
}

function redraw(buffers) {
    points = []
    tetrahedron(va, vb, vc, vd, subdivisionLevel);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    render();
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
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    // Load shaders and initialize attribute buffers
    const program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    const buffers = initBuffers();

    // Setup aPosition attribute
    const aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer( aPosition, POSITION_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    // // Setup aColor attribute
    // const aColor = gl.getAttribLocation( program, "aColor" );
    // gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    // gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray( aColor );

    // Setup view, projection matrices
    var modelMatrixLocation = gl.getUniformLocation(program, "modelMatrix");
    var viewMatrixLocation = gl.getUniformLocation(program, "viewMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    var eye = vec3(0, 0, 8);
    var at = vec3(0, 0, 0);
    var up = vec3(0.0, 1.0, 0.0);
    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.0001, 100)

    gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(0, 0, 0)));
    render();
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, points.length);
}

function initBuffers() {
    // // Color buffer
    // const colorBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        // color: colorBuffer,
    };
}


