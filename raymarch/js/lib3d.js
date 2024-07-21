const is_local = true;
let time = 0;

class Shader {
	read_file(path) {
		const req = new XMLHttpRequest();
		req.open("GET", path + "?" + new Date().getTime(), false);

		req.send();
		return req.responseText;
	}

	constructor(name) {
		this.path = (is_local ? "./" : "../") + "shader/" + name + "/";
		this.vert_path = this.path + name + ".vert";
		this.frag_path = this.path + name + ".frag";
		
		this.vert_code = this.read_file(this.vert_path);
		this.frag_code = this.read_file(this.frag_path);

		this.vert = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(this.vert, this.vert_code);
		gl.compileShader(this.vert);

		if (!gl.getShaderParameter(this.vert, gl.COMPILE_STATUS)) {
			console.log(gl.getShaderInfoLog(this.vert));
		}

		this.frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(this.frag, this.frag_code);
		gl.compileShader(this.frag);

		if (!gl.getShaderParameter(this.frag, gl.COMPILE_STATUS)) {
			console.log(gl.getShaderInfoLog(this.frag));
		}

		this.program = gl.createProgram();
		gl.attachShader(this.program, this.vert);
		gl.attachShader(this.program, this.frag);

		gl.linkProgram(this.program);
	}

	use() {
		gl.useProgram(this.program);
	}
}

class Lib3d {
	constructor(canvas, shader) {
		window.vec3 = glMatrix.vec3;
		window.mat3 = glMatrix.mat3;
		window.mat4 = glMatrix.mat4;
		console.log(glMatrix);

		window.gl = canvas.getContext("webgl");
		
		if(gl == null) {
			alert("Skaffa en bättre webbläsare...");
			return;
		}

		this.primitives = {
			RAY_MARCH_DEMO: {
				draw: (x, y, w, h, camera_pos, camera_dir) => {
					const index = [
						0, 1, 2,	// front
						2, 1, 3,
					];

					const verts = [
						x, y,
						x + w, y,
						x, y + h,
						x + w, y + h,
					];

					const indx_buf = gl.createBuffer();

					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indx_buf);
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

					const vert_buf = gl.createBuffer();

					gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
					gl.bindBuffer(gl.ARRAY_BUFFER, null);

					gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indx_buf);

					gl.vertexAttribPointer(gl.getAttribLocation(this.default_shader.program, "pos"), 2, gl.FLOAT, false, 0, 0);
					gl.enableVertexAttribArray(gl.getAttribLocation(this.default_shader.program, "pos"));

					gl.uniform3f(gl.getUniformLocation(this.default_shader.program, "camera_pos"), camera_pos.x, camera_pos.y, camera_pos.z);
					gl.uniform3f(gl.getUniformLocation(this.default_shader.program, "camera_dir"), camera_dir.pitch, camera_dir.yaw, camera_dir.roll);
					gl.uniform2f(gl.getUniformLocation(this.default_shader.program, "screen_size"), canvas.width, canvas.height);
					gl.uniform1f(gl.getUniformLocation(this.default_shader.program, "t"), time += 0.01);

					gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
				}
			},
			CUBE: {
				draw: (x, y, z, size, mode) => {
					const index = [
						0, 1, 2,	// front
						2, 1, 3,
	
						1, 5, 3,	// right
						3, 5, 7,
	
						4, 5, 6,	// back
						6, 5, 7,
	
						5, 0, 7,	// left
						7, 0, 2,
	
						2, 3, 7,	// up
						7, 3, 6,
	
						5, 4, 0,	// down
						0, 4, 1
					];

					const verts = [
						x, y, z,
						x + size, y, z,
						x, y + size, z,
						x + size, y + size, z,
						x, y, z + size,
						x + size, y, z + size,
						x, y + size, z + size,
						x + size, y + size, z + size,
					];

					const indx_buf = gl.createBuffer();
					console.log(canvas);

					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indx_buf);
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

					const vert_buf = gl.createBuffer();

					gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
					gl.bindBuffer(gl.ARRAY_BUFFER, null);

					gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indx_buf);

					const pos = gl.getAttribLocation(this.default_shader.program, "pos");
					gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);
					gl.enableVertexAttribArray(pos);

					gl.uniformMatrix4fv(gl.getUniformLocation(this.default_shader.program, "m_world"), false, this.world_matrix);
					gl.uniformMatrix4fv(gl.getUniformLocation(this.default_shader.program, "m_view"), false,  this.view_matrix);
					gl.uniformMatrix4fv(gl.getUniformLocation(this.default_shader.program, "m_proj"), false,  this.proj_matrix);

					gl.drawElements(mode, index.length, gl.UNSIGNED_SHORT, 0);
				}
			},
		}

		this.world_matrix =	mat4.create();
		this.view_matrix =	mat4.create();
		this.proj_matrix =	mat4.create();
		this.proj_matrix_inverse =	mat4.create();

		gl.clearColor(0.1, 0.1, 0.1, 1);

		this.default_shader = new Shader(shader);
		this.default_shader.use();

		this.resize();
	}
	
	resize() {
		gl.viewport(0, 0, canvas.width, canvas.height);
	}

	clear() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	begin(size) {
		this.verts = new Array(size == undefined ? 0 : size);
	}

	v3(x, y, z) {
		this.verts.push(x, y, z);
	}

}