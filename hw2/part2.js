"use strict";

// Num of floats in each attribute
const POSITION_SIZE = 2
const COLOR_SIZE = 4

var gl;
var points;

var maxNumVertices = 600;
var index = 0;

var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),           // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),           // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),           // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),           // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),           // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),           // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),           // cyan
    vec4( 1.0, 1.0, 1.0, 1.0 ),           // white
    vec4( 0.3921, 0.5843, 0.9294, 1.0 )   // cornflower
];

var currentColorIndex = 0;

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    // Attach mouse click event listener
    canvas.addEventListener("mousedown", function(event){
        var boundingRect = event.target.getBoundingClientRect();
        gl.bindBuffer( gl.ARRAY_BUFFER, buffers.position );
        var t = vec2(2*(event.clientX - boundingRect.left)/canvas.width-1, 
           2*(canvas.height-(event.clientY - boundingRect.top))/canvas.height-1);
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

        gl.bindBuffer( gl.ARRAY_BUFFER, buffers.color );
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(colors[currentColorIndex]));

        index++;
    });

    // Attach "ClearCanvas" button event listener
    var clearCanvasButton = document.getElementById("ClearCanvas");
    clearCanvasButton.addEventListener("click", function() { 
        index = 0;
        clearCanvas();
    });

    // Attach "ColorMenu" select event listener
    var colorMenu = document.getElementById("ColorMenu");
    colorMenu.addEventListener("click", function() {
       currentColorIndex = colorMenu.selectedIndex;
    });
  

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    var currentColor = colors[currentColorIndex];
    clearCanvas(8);

    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var buffers = initBuffers();

    // Setup aPosition
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, POSITION_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    // Setup aColor
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    const aColor = gl.getAttribLocation( program, "aColor" );
    gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( aColor );

    render();
};

function initBuffers() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function clearCanvas(index = -1){
    if (index === -1) {
        index = currentColorIndex;
    }
    var currentColor = colors[index];
    gl.clearColor(currentColor[0], currentColor[1],
              currentColor[2], currentColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    if (index > 0) {
        gl.drawArrays( gl.POINTS, 0, index);
    }
    window.requestAnimFrame(render);
}

