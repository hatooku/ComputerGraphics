"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 3;
const COLOR_SIZE = 4;
const TEX_COORD_SIZE = 2;

const ground_points = [
    vec3(-2,-1,-5),
    vec3(-2,-1,-1),
    vec3(2,-1,-5),
    vec3(2,-1,-1),
]

const small1_points = [
    vec3(0.25,-0.5,-1.75),
    vec3(0.25,-0.5,-1.25),
    vec3(0.75,-0.5,-1.75),
    vec3(0.75,-0.5,-1.25),
]

const small2_points = [
    vec3(-1,0,-2.5),
    vec3(-1,-1,-2.5),
    vec3(-1,0,-3),
    vec3(-1,-1,-3),
]

var texCoords = [
    vec2(0, 0.0),
    vec2(0, 1.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
];

const lightCenter = [0, 2, -2]
const lightRadius = 2;
const lightRotationSpeed = 0.03;
var lightTheta = 0;

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
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.BACK);

    const program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = function () {
        // Texture 1
        var texture1 = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        // Texture 2 (red)
        var image2 = new Uint8Array([255, 0, 0]);

        var texture2 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture2);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, image2);

        render();
    };
    image.src = 'xamp23.png';

    // Load shaders and initialize attribute buffers

    const buffers = initBuffers();

    // Setup aPosition attribute
    const aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer( aPosition, POSITION_SIZE, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Model-view matrix
    var eye = vec3(0, 0, 0.5);
    var at = vec3(0, -1, -3);
    var up = vec3(0.0, 1.0, .0);
    var view = lookAt(eye, at, up);
    var model = translate(0,0,0);
    var modelViewMatrix = mult(view, model);

    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");
    var projectionMatrix = perspective(90.0, canvas.width/canvas.height, 0.3, 10)
    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));

    function render() {
        gl.clear( gl.COLOR_BUFFER_BIT );

        // Light position update
        lightTheta = (lightTheta + lightRotationSpeed) % (2 * Math.PI);
        var lightPosition =  vec3(
            lightCenter[0] + lightRadius * Math.sin(lightTheta),
            lightCenter[1],
            lightCenter[2] + lightRadius * Math.cos(lightTheta));

        // Calculate model-view matrix for shadows
        var m = mat4(); // Shadow projection matrix initially an identity matrix
        m[3][3] = 0.0;
        m[3][1] = -1.0/(lightPosition[1] - ground_points[0][1]);

        // Model-view matrix for shadow then render
        var shadowModelViewMatrix = mult(modelViewMatrix, translate(lightPosition[0], lightPosition[1], lightPosition[2]));
        shadowModelViewMatrix = mult(shadowModelViewMatrix, m);
        shadowModelViewMatrix = mult(shadowModelViewMatrix, translate(-lightPosition[0], -lightPosition[1], -lightPosition[2]));
            

        // Ground
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
        gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, ground_points.length );

        // Shadows
        var offset = ground_points.length;
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(shadowModelViewMatrix));
        gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);

        gl.drawArrays( gl.TRIANGLE_STRIP, offset, small1_points.length );
        offset += small1_points.length;
        gl.drawArrays( gl.TRIANGLE_STRIP, offset, small2_points.length );
        offset -= small1_points.length;

        // Rectangles
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
        gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);

        gl.drawArrays( gl.TRIANGLE_STRIP, offset, small1_points.length );
        offset += small1_points.length;
        gl.drawArrays( gl.TRIANGLE_STRIP, offset, small2_points.length );

        requestAnimFrame(render);
    }
};

function initBuffers() {
    // // Color buffer
    // const colorBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positionBufferSize = 4 * POSITION_SIZE * (ground_points.length + small1_points.length + small2_points.length);
    gl.bufferData(gl.ARRAY_BUFFER, positionBufferSize, gl.STATIC_DRAW);

    var offset = 0;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(ground_points));
    offset += 4 * POSITION_SIZE * ground_points.length;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(small1_points));
    offset += 4 * POSITION_SIZE * small1_points.length;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(small2_points));

    const tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    const tBufferSize = 4 * TEX_COORD_SIZE * (ground_points.length + small1_points.length + small2_points.length);
    gl.bufferData(gl.ARRAY_BUFFER, tBufferSize, gl.STATIC_DRAW);

    var offset = 0;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(texCoords));
    offset += 4 * TEX_COORD_SIZE * texCoords.length;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(texCoords));
    offset += 4 * TEX_COORD_SIZE * texCoords.length;
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(texCoords));
    return {
        position: positionBuffer,
        // color: colorBuffer,
        texture: tBuffer,
    };
}


