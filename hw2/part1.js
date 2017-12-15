"use strict";

var gl;
var points;

var maxNumVertices  = 600;
var index = 0;

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
        index++;
    } );

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    var buffers = initBuffers();
    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    render();
};

function initBuffers() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.POINTS, 0, index);
    window.requestAnimFrame(render);
}


