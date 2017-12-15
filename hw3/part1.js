"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 3
const COLOR_SIZE = 4

const numVertices = 48;

const vertices = [
    vec3(0, 0, 1),
    vec3(0, 1, 1),
    vec3(1, 1, 1),
    vec3(1, 0, 1),
    vec3(0, 0, 0),
    vec3(0, 1, 0),
    vec3(1, 1, 0),
    vec3(1, 0, 0),
];
var points = [];

function quad(a, b, c, d)
{
   var indices = [ a, b, b, c, c, d, d, a]
   for ( var i = 0; i < indices.length; ++i ) {
      points.push( vertices[indices[i]]);
      // colors.push( vertexColors[indices[i]] );
    }
}


function drawCube( )
{
    quad(0,3,2,1);
    quad(2,3,7,6);
    quad(0,4,7,3);
    quad(1,2,6,5);
    quad(4,5,6,7);
    quad(0,1,5,4);
}


window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    drawCube();

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

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
    // const aColor = gl.getAttribLocation( program, "aColor" );
    // gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    // gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray( aColor );

    // Setup modelViewMatrix
    var modelViewMatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");
    var eye = vec3(0.5, 0.5, 0.5);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    var view = lookAt(eye, at, up);
    var model = translate(0,0,0);
    var modelViewMatrix = mult(view, model);
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, flatten(modelViewMatrix));

    render();
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.LINES, 0, numVertices );

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


