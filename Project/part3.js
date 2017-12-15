"use strict";

var gl;

// Num of floats in each attribute
const POSITION_SIZE = 4;
const COLOR_SIZE = 4;
const BG_COL = vec4(0.2, 0.2, 0.2, 1.0);

var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.942809, -0.333333, 1);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
var vd = vec4(0.816497, -0.471405, -0.333333, 1);

var pointsArray = [];

var subdivisionLevel = 7;

var cubemap = ['textures/cm_left.png', // POSITIVE_X
               'textures/cm_right.png', // NEGATIVE_X
               'textures/cm_top.png', // POSITIVE_Y
               'textures/cm_bottom.png', // NEGATIVE_Y
               'textures/cm_back.png', // POSITIVE_Z
               'textures/cm_front.png']; // NEGATIVE_Z 

var cubeMapSidesLoaded = 0; // Count how many have been loaded

const background_points = [
    vec4(-1.0, -1.0, 0.999, 1.0),
    vec4(1.0, -1.0, 0.999, 1.0),
    vec4(-1.0, 1.0, 0.999, 1.0),
    vec4(1.0, 1.0, 0.999, 1.0),
]

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
    pointsArray.push(v1);
    pointsArray.push(v2);
    pointsArray.push(v3);
}

window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert( "WebGL isn't available" );
        return;
    }

    tetrahedron(va, vb, vc, vd, subdivisionLevel);

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(BG_COL[0], BG_COL[1], BG_COL[2], BG_COL[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Load shaders and initialize attribute buffers
    const program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    var cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    var cubemapSides = [gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];

    for (var i = 0; i < cubemap.length; i++) {
        var image = document.createElement('img');
        image.cubemapSide = cubemapSides[i];
        image.crossorigin = 'anonymous';
        image.onload = function(event) {
            var image = event.target;
            cubeMapSidesLoaded += 1;
            gl.texImage2D(image.cubemapSide, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            if (cubeMapSidesLoaded == cubemap.length) {
                render();
            }
        }
        image.src = cubemap[i];
    }

    const buffers = initBuffers(program);


    // Setup aPosition attribute
    program.a_Position = gl.getAttribLocation( program, "aPosition" );
    initAttributeVariable(gl, program.a_Position, buffers.position);

    // Setup view, projection matrices
    var modelMatrixLocation = gl.getUniformLocation(program, "modelMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(program, "projectionMatrix");
    var viewMatrixLocation = gl.getUniformLocation(program, "viewMatrix");

    var projectionMatrix = perspective(90.0, canvas.width/canvas.height, 0.0001, 100)

    function render() {
        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.clear( gl.DEPTH_BUFFER_BIT );

        var eye = vec3(0, 0, 3);
        var at = vec3(0, 0, 0);
        var up = vec3(0.0, 1.0, 0.0);
        var viewMatrix = lookAt(eye, at, up);

        var viewMatrixRot = mat4(
            vec4(viewMatrix[0][0], viewMatrix[0][1], viewMatrix[0][2], 0),
            vec4(viewMatrix[1][0], viewMatrix[1][1], viewMatrix[1][2], 0),
            vec4(viewMatrix[2][0], viewMatrix[2][1], viewMatrix[2][2], 0),
            vec4(0.0, 0.0, 0.0, 1.0)
        );

        // Environment
        gl.disable(gl.DEPTH_TEST);
        var mtex = mult(inverse(viewMatrixRot), inverse(projectionMatrix));
        gl.uniform1f(gl.getUniformLocation(program, "reflexive"), 0);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mTex"), false, flatten(mtex));
        gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(mat4()));
        gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(mat4()));
        gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(mat4()));
        gl.drawArrays( gl.TRIANGLE_STRIP, pointsArray.length, background_points.length);
        gl.enable(gl.DEPTH_TEST);

        // Ball
        gl.uniform1f(gl.getUniformLocation(program, "reflexive"), 1);
        gl.uniform3fv(gl.getUniformLocation(program, "eye"), flatten(eye));   
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mTex"), false, flatten(mat4()));        
        gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(viewMatrixLocation, false, flatten(viewMatrix));
        gl.uniformMatrix4fv(modelMatrixLocation, false, flatten(translate(0, 0, 0)));
        gl.drawArrays( gl.TRIANGLES, 0, pointsArray.length);

        // requestAnimFrame(render);
    }
};

function initBuffers(program) {
    gl.useProgram(program);
    // Load the data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray.concat(background_points)), gl.STATIC_DRAW);
    positionBuffer.num = POSITION_SIZE;
    positionBuffer.type = gl.FLOAT;

    return {
        position: positionBuffer,
    };
}

function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}
