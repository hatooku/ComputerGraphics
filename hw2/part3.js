"use strict";

const VEC2_SIZE = 2;
const VEC4_size = 4;
const POSITION_BYTES = 8;
const COLOR_BYTES = 16;

const MAX_NUM_VERTICES  = 600;
const COLORS = [
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

var gl;

var mode = 0; // 0: points, 1: triangles
var currentColorIndex = 0;

var pointPoints = []; // vec2 array
var pointColors = []; // vec4 array
var pointCount = 0;

var trianglePoints = []; // vec2 array
var triangleColors = []; // vec4 array
var triangleCount = 0; // total number of triangles
var triangleCurrentCount = 0; // # points in current triangle mode


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
        var point = vec2(2*(event.clientX - boundingRect.left)/canvas.width-1, 
           2*(canvas.height-(event.clientY - boundingRect.top))/canvas.height-1);
        if (mode === 0) {
            pointPoints.push(point);
            pointColors.push(COLORS[currentColorIndex]);
            pointCount++;    
        }
        else if (mode === 1) {
            triangleCurrentCount++;
            if (triangleCurrentCount % 3 === 0) {
                trianglePoints.push(point);
                trianglePoints.push(pointPoints.pop());
                trianglePoints.push(pointPoints.pop());

                triangleColors.push(COLORS[currentColorIndex]);
                triangleColors.push(pointColors.pop());
                triangleColors.push(pointColors.pop());

                triangleCount += 1;
                pointCount -= 2;
            }
            else {
                pointPoints.push(point);
                pointColors.push(COLORS[currentColorIndex]);
                pointCount++;
            }
        }

        updateBuffers(buffers);
    });

    // Attach "PointMode" button event listener
    var pointModeButton = document.getElementById("PointMode");
    pointModeButton.addEventListener("click", function() { 
        mode = 0;
    });

    // Attach "TriangleMode" button event listener
    var triangleModeButton = document.getElementById("TriangleMode");
    triangleModeButton.addEventListener("click", function() { 
        mode = 1;
        triangleCurrentCount = 0;
    });

    // Attach "ClearCanvas" button event listener
    var clearCanvasButton = document.getElementById("ClearCanvas");
    clearCanvasButton.addEventListener("click", function() { 
        pointCount = 0;
        clearCanvas();
    });

    // Attach "ColorMenu" select event listener
    var colorMenu = document.getElementById("ColorMenu");
    colorMenu.addEventListener("click", function() {
       currentColorIndex = colorMenu.selectedIndex;
    });
  

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    var currentColor = COLORS[currentColorIndex];
    clearCanvas(8);

    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var buffers = initBuffers();
    updateBuffers(buffers);

    // Setup aPosition
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, VEC2_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    // Setup aColor
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    const aColor = gl.getAttribLocation( program, "aColor" );
    gl.vertexAttribPointer(aColor, VEC4_size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( aColor );

    render();
};

function initBuffers() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, POSITION_BYTES * MAX_NUM_VERTICES, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, COLOR_BYTES * MAX_NUM_VERTICES, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function updateBuffers(buffers) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer( gl.ARRAY_BUFFER, buffers.position );

    var offset = 0;
    for (var i = 0; i < pointCount; i++) {
        gl.bufferSubData(gl.ARRAY_BUFFER, POSITION_BYTES * (i + offset), flatten(pointPoints[i]));
    }
    offset += pointCount;
    for (var i = 0; i < 3 * triangleCount; i++) {
        gl.bufferSubData(gl.ARRAY_BUFFER, POSITION_BYTES * (i + offset), flatten(trianglePoints[i]));
    }

    offset = 0;

    gl.bindBuffer( gl.ARRAY_BUFFER, buffers.color );
    for (var i = 0; i < pointCount; i++) {
        gl.bufferSubData(gl.ARRAY_BUFFER, COLOR_BYTES * (i + offset), flatten(pointColors[i]));
    }
    offset += pointCount;
    for (var i = 0; i < 3 * triangleCount; i++) {
        gl.bufferSubData(gl.ARRAY_BUFFER, COLOR_BYTES * (i + offset), flatten(triangleColors[i]));
    }
}

function clearCanvas(colorIndex = -1){
    pointPoints = [];
    pointColors = [];
    pointCount = 0;

    trianglePoints = [];
    triangleColors = [];
    triangleCount = 0;

    if (colorIndex === -1) {
        colorIndex = currentColorIndex;
    }
    var currentColor = COLORS[colorIndex];
    gl.clearColor(currentColor[0], currentColor[1],
              currentColor[2], currentColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    var offset = 0;
    if (pointCount > 0) {
        gl.drawArrays( gl.POINTS, offset, pointCount);
    }
    offset += pointCount;
    if (triangleCount > 0) {
        gl.drawArrays(gl.TRIANGLES, offset, 3 * triangleCount);
    }
    window.requestAnimFrame(render);
}

