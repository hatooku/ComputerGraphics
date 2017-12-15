"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 2;

const MAX_TRANSLATION = 0.5;

const radius = 0.4;
const numPoints = 50;

var yPosition = 0.0;

const vertices = [
    0, 0,
]; 

// Add points along circle
for (var i = 0; i < numPoints; i++) {
    const angle = i * (2 * Math.PI / (numPoints - 1));
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    vertices.push(x);
    vertices.push(y);
}


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


    var then = 0;
    var direction = 1;

    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        if (yPosition > MAX_TRANSLATION || yPosition < -1 * MAX_TRANSLATION) {
            direction *= -1;
        }

        yPosition += direction * 0.025;

        var yTranslationLocation = gl.getUniformLocation(program, "yTranslation");
        gl.uniform1f(yTranslationLocation, yPosition);

        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.drawArrays( gl.TRIANGLE_FAN, 0, vertices.length / 2);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

};

function initBuffers() {
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function degrees_to_radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}



// 