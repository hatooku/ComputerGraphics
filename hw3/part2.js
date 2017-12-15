"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 3
const COLOR_SIZE = 4

const verticesPerCube = 48;

var points = [];

function drawCube(x1, y1, z1, x2, y2, z2) {
    const vertices = [
        vec3(x1, y1, z2),
        vec3(x1, y2, z2),
        vec3(x2, y2, z2),
        vec3(x2, y1, z2),
        vec3(x1, y1, z1),
        vec3(x1, y2, z1),
        vec3(x2, y2, z1),
        vec3(x2, y1, z1),
    ];

    quad(vertices, 0,3,2,1);
    quad(vertices, 2,3,7,6);
    quad(vertices, 0,4,7,3);
    quad(vertices, 1,2,6,5);
    quad(vertices, 4,5,6,7);
    quad(vertices, 0,1,5,4);
}

function quad(vertices, a, b, c, d)
{
   var indices = [ a, b, b, c, c, d, d, a]
   for ( var i = 0; i < indices.length; ++i ) {
      points.push( vertices[indices[i]]);
      // colors.push( vertexColors[indices[i]] );
    }
}


window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    drawCube(0, 0, 0, 1, 1, 1);
    drawCube(0, 0, 0, 1, 1, 1);
    drawCube(0, 0, 0, 1, 1, 1);

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

    // Setup view, projection matrices
    var modelMatrixLocation = gl.getUniformLocation(program, "modelMatrix");
    var viewMatrixLocation = gl.getUniformLocation(program, "viewMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    var eye = vec3(0.5, 0.5, 8);
    var at = vec3(0.5,0.5,0.5);
    var up = vec3(0.0, 1.0, 0.0);
    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.0001, 100)

    gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
    // render();

    gl.clear( gl.COLOR_BUFFER_BIT );

    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(-2, 0,0)));
    gl.drawArrays( gl.LINES, 0, verticesPerCube);

    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(0, 0,0)));
    gl.drawArrays( gl.LINES, verticesPerCube, verticesPerCube);
    
    gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(2, 2,0)));
    gl.drawArrays( gl.LINES, 2 * verticesPerCube, verticesPerCube);
};

function render() {
    // gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.LINES, 0, verticesPerCube);
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


