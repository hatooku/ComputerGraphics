"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 3
const COLOR_SIZE = 4

const points = [
    vec3(4, -1, -1),
    vec3(-4, -1, -1),
    vec3(4, -1, -21),
    vec3(-4, -1, -21)
]

const colors = [
    vec4(1,1,1,1),
    vec4(1,1,1,1),
    vec4(1,1,1,1),
    vec4(1,1,1,1)
]

var texCoords = [
    vec2(2.5, 10.0),
    vec2(-1.5, 10.0),
    vec2(2.5, 0.0),
    vec2(-1.5, 0.0),
];

// var points = [vec3(-1, 1, 0), vec3(1, 1, 0), vec3(-1, -1, 0), vec3(1, -1, 0)];


window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    // Attach "Repeat" button event listener
    var repeatButton = document.getElementById("Repeat");
    repeatButton.addEventListener("click", function() { 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        render();
    });

    // Attach "Clamp" button event listener
    var clampButton = document.getElementById("Clamp");
    clampButton.addEventListener("click", function() { 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        render();
    });

    // Attach "Nearest" button event listener
    var nearestButton = document.getElementById("Nearest");
    nearestButton.addEventListener("click", function() { 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        render();
    });

    // Attach "Linear" button event listener
    var linearButton = document.getElementById("Linear");
    linearButton.addEventListener("click", function() { 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        render();
    });

    // Attach "Mipmap" button event listener
    var mipmapButton = document.getElementById("Mipmap");
    mipmapButton.addEventListener("click", function() { 
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        render();
    });

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
    const aColor = gl.getAttribLocation( program, "aColor" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(aColor, COLOR_SIZE, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( aColor );

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    var modelViewMatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");
    var eye = vec3(0, 5, 1);
    var at = vec3(0, 4, 0.0);
    var up = vec3(0.0, 1.0, .0);
    var view = lookAt(eye, at, up);
    var model = translate(0,0,0);
    var modelViewMatrix = mult(view, model);
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, flatten(modelViewMatrix));

    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");
    var projectionMatrix = perspective(90.0, canvas.width/canvas.height, 0.5, 100000)
    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);


    var texSize = 64;
    var numRows = 8;
    var numCols = 8;
    var myTexels = new Uint8Array(4*texSize*texSize);
    for (var i = 0; i < texSize; ++i) {
        for (var j = 0; j < texSize; ++j) {
            var patchx = Math.floor(i/(texSize/numRows));
            var patchy = Math.floor(j/(texSize/numCols));
            var c = (patchx%2 !== patchy%2 ? 255 : 0);
            myTexels[4*i*texSize+4*j] = c;
            myTexels[4*i*texSize+4*j+1] = c;
            myTexels[4*i*texSize+4*j+2] = c;
            myTexels[4*i*texSize+4*j+3] = 255;
        }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, myTexels);


    render();
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, points.length );
}

function initBuffers() {
    // Color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    const tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        texture: tBuffer,
    };
}


