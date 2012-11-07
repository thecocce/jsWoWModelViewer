var ModelViewer = function (opt) {
	this.opt = opt;
	this.width = window.innerWidth;
	this.height = window.innerHeight;
	
	this.pMatrix = mat4.create();
	this.mvMatrix = mat4.create();
	
	this.eye = vec3.create([0.0, -1.0, -0.2]);
	this.center = vec3.create([0.2, 3.2, 0.2]);
	this.up = vec3.create([0, 0, 1]);
	
	this.angle = 0;

	var that = this;
	new M2(opt.file, function (model) { that.parse(model); });
};

ModelViewer.prototype = {
	drawScene: function () {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		mat4.perspective(45, this.width / this.height, 0.1, 100.0, this.pMatrix);
		mat4.identity(this.mvMatrix);

		mat4.lookAt(this.eye, this.center, this.up, this.mvMatrix);

		mat4.rotateZ(this.mvMatrix, this.angle);

		// Vertex
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glModel);
		this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.glModel.itemSize, this.gl.FLOAT, false, 0, 0);

		// Texture Coords
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glTextureCoords);
		this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.glTextureCoords.itemSize, this.gl.FLOAT, false, 0, 0);

		// Texture
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);

		// Vertex Index
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.glVertexIndexBuffer);

		// Draw
		this.setMatrixUniforms();
		this.gl.drawElements(this.gl.TRIANGLES, this.glVertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);

		this.angle += 0.01;

	},

	initGL: function (canvas) {
		try {
		  this.gl = canvas.getContext("experimental-webgl");
		} catch(e) {
		}
		if (!this.gl) {
		  alert("Could not initialise WebGL, sorry :-(");
		}
	},

	getShader: function (gl, id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
		  return null;
		}

		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
		  if (k.nodeType == 3) {
		    str += k.textContent;
		  }
		  k = k.nextSibling;
		}

		var shader;
		if (shaderScript.type == "x-shader/x-fragment") {
		  shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
		  shader = this.gl.createShader(this.gl.VERTEX_SHADER);
		} else {
		  return null;
		}

		this.gl.shaderSource(shader, str);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
		  alert(this.gl.getShaderInfoLog(shader));
		  return null;
		}

		return shader;
	},

	initShaders: function () {
		var fragmentShader = this.getShader(gl, "shader-fs");
		var vertexShader = this.getShader(gl, "shader-vs");

		this.shaderProgram = this.gl.createProgram();
		this.gl.attachShader(this.shaderProgram, vertexShader);
		this.gl.attachShader(this.shaderProgram, fragmentShader);
		this.gl.linkProgram(this.shaderProgram);

		if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
		  alert("Could not initialise shaders");
		}

		this.gl.useProgram(this.shaderProgram);

		this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
		this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

		this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
		this.gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

		this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
		this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
	},

	setMatrixUniforms: function () {
		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, new Float32Array(this.pMatrix));
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, new Float32Array(this.mvMatrix));
	},

	glStart: function () {
		var canvas = document.getElementById("gl");
		canvas.width = this.width;
		canvas.height = this.height;

		this.initGL(canvas);
		this.initShaders();
		this.createGLModel();

		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.clearDepth(1.0);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);

		this.gl.viewport(0, 0, this.width, this.height);

		var that = this;
		setInterval(function () { that.drawScene(); }, 15);
	},

	createGLModel: function () {
		/* Vertex */
		var vertices = [];
		for (var i = 0; i < this.model.vertices.length; ++i) {
			for (var j = 0; j < 3; ++j) {
				vertices[i * 3 + j] = this.model.vertices[i].position[j];
			}
		}

		this.glModel = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glModel);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
		this.glModel.itemSize = 3;
		this.glModel.numItems = this.model.vertices.length;

		/* Vertex Index */
		var indices = this.model.views[0].triangles;
		this.glVertexIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.glVertexIndexBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
		this.glVertexIndexBuffer.itemSize = 1;
		this.glVertexIndexBuffer.numItems = indices.length;

		/* Texture Coords */
		var coords = [];
		for (var i = 0; i < this.model.vertices.length; ++i) {
			for (var j = 0; j < 2; ++j) {
				coords[i * 2 + j] = this.model.vertices[i].textureCoords[j];
			}
		}

		this.glTextureCoords = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glTextureCoords);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(coords), this.gl.STATIC_DRAW);
		this.glTextureCoords.itemSize = 2;
		this.glTextureCoords.numItems = this.model.vertices.length;

		/* Textures */
		this.createTexture('assets/Item/Objectcomponents/weapon/axe_1h_blacksmithing_d_01.png');
	},

	createTexture: function (path) {
		var that = this;

		this.texture = this.gl.createTexture();
		this.texture.image = new Image();
		this.texture.image.onload = function () {
			that.handleLoadedTexture(that.texture);
		}
		this.texture.image.src = path;
	},

	handleLoadedTexture: function (texture) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture.image);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	},

	parse: function (data) {
		this.model = data;
		if (typeof console !== 'undefined') {
			console.log('Parsed Model', data);
			$('textarea')
				.html(JSON.stringify(data, null, 2));
		}
		this.glStart();
	}
};

$(function () {
	model = new ModelViewer({
		file: 'assets/Item/Objectcomponents/weapon/axe_1h_blacksmithing_d_01.m2'
	});
});