"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 2
const COLOR_SIZE = 4

const vertices = [
    0, 0,
    1, 1,
    1, 0,
]; 

const colors = [
    1.0,  0.0,  0.0,  1.0,    // red
    0.0,  0.0,  1.0,  1.0,    // blue
    0.0,  1.0,  0.0,  1.0,    // green
];

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

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

    // Setup aColor attribute
    const aColor = gl.getAttribLocation( program, "aColor" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( aColor );

    render();
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, 3);
}

function initBuffers() {
    // Color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}


